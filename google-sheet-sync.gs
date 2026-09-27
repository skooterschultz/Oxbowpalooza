const SHEET_NAME = "RSVPs";
const HEADERS = [
  "RSVP ID",
  "Submitted At",
  "Name",
  "Nickname",
  "Email Addresses",
  "City Traveling From",
  "Address",
  "Family Branch",
  "Dietary Restrictions",
  "Days Attending",
  "Birth Month",
  "Birth Day",
  "Birth Year",
  "Height Inches",
  "Miles",
  "Arrival Date",
  "Arrival Time",
  "Flying Into",
  "Departure Date",
  "Departure Time",
  "Flight Notes",
  "Origin Latitude",
  "Origin Longitude",
  "Last Synced"
];

const FIELD_BY_HEADER = {
  "RSVP ID": "id",
  "Submitted At": "createdAt",
  "Name": "name",
  "Nickname": "nickname",
  "Email Addresses": "email",
  "City Traveling From": "city",
  "Address": "address",
  "Family Branch": "invitedBy",
  "Dietary Restrictions": "foodNotes",
  "Days Attending": "daysAttending",
  "Birth Month": "birthMonth",
  "Birth Day": "birthDay",
  "Birth Year": "birthYear",
  "Height Inches": "heightInches",
  "Miles": "miles",
  "Arrival Date": "arrivalDate",
  "Arrival Time": "arrivalTime",
  "Flying Into": "arrivalAirport",
  "Departure Date": "departureDate",
  "Departure Time": "departureTime",
  "Flight Notes": "flightNotes",
  "Origin Latitude": "originLat",
  "Origin Longitude": "originLng"
};

function getRsvpSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function setupRsvpSheet() {
  const sheet = getRsvpSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight("bold")
    .setBackground("#17385f")
    .setFontColor("#fffaf0");
  sheet.autoResizeColumns(1, HEADERS.length);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const expectedSecret = PropertiesService.getScriptProperties().getProperty("SYNC_SECRET");
    if (!expectedSecret || payload.secret !== expectedSecret) {
      return json_({ ok: false, error: "Unauthorized." });
    }

    if (payload.action !== "upsert" || !payload.entry) {
      return json_({ ok: false, error: "Invalid sync request." });
    }

    setupRsvpSheet();
    upsertEntry_(payload.entry);
    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  }
}

function upsertEntry_(entry) {
  const sheet = getRsvpSheet_();
  const values = HEADERS.map((header) => {
    if (header === "Last Synced") {
      return new Date();
    }
    return entry[FIELD_BY_HEADER[header]] ?? "";
  });
  const id = String(entry.id || "");
  const lastRow = sheet.getLastRow();
  let row = lastRow + 1;

  if (id && lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
    const index = ids.findIndex((candidate) => String(candidate) === id);
    if (index >= 0) {
      row = index + 2;
    }
  }

  sheet.getRange(row, 1, 1, HEADERS.length).setValues([values]);
}

function syncEditedRowToD1(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_NAME || e.range.getRow() === 1) {
    return;
  }

  const row = e.range.getRow();
  const values = sheet.getRange(row, 1, 1, HEADERS.length).getDisplayValues()[0];
  const entry = {};
  HEADERS.forEach((header, index) => {
    const field = FIELD_BY_HEADER[header];
    if (field) {
      entry[field] = values[index];
    }
  });

  if (!entry.id) {
    return;
  }

  const properties = PropertiesService.getScriptProperties();
  const endpoint = properties.getProperty("CLOUDFLARE_SYNC_URL");
  const secret = properties.getProperty("SYNC_SECRET");
  if (!endpoint || !secret) {
    throw new Error("Set CLOUDFLARE_SYNC_URL and SYNC_SECRET in Script Properties.");
  }

  const response = UrlFetchApp.fetch(endpoint, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: `Bearer ${secret}` },
    payload: JSON.stringify({ entry }),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error(`D1 update failed: ${response.getContentText()}`);
  }

  sheet.getRange(row, HEADERS.indexOf("Last Synced") + 1).setValue(new Date());
}

function installSheetEditTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === "syncEditedRowToD1")
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("syncEditedRowToD1")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
