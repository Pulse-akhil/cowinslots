var http = require("http");

var fetch = require("node-fetch");

const slackWebhookUrl =
  "https://hooks.slack.com/services/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"; // Your Slack webhook URL
const authorization = ""; // Bearer auth string
const cowinUrl =
  "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=395&date=01-05-2021";

function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

async function main() {
  while (true) {
    const d = new Date();

    console.log("Checking at", d.toLocaleTimeString());
    const changed = await check();
    if (changed) {
      break;
    }
    // sleep for 5 mins
    await sleep(300000);
  }
}

function sendToSlack(message) {
  return fetch(slackWebhookUrl, {
    body: JSON.stringify({
      text: message
    }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
}

function uniq(arr) {
  const s = new Set(arr);
  return Array.from(s);
}

function extractcenters(respjson) {
  let centers = [];

  //if you dont find any valid response send back empty
  if (!("centers" in respjson)) {
    return centers;
  }

  centers = respjson.centers.filter((centre) => {
    return centre.sessions.some((session) => session.available_capacity >= 1);
  });

  //sendToSlack(centers[0].name);
  //return (centers);

  return centers.map((c) => {
    return {
      name: c.name,
      pin: c.pincode,
      vaccines:
        uniq(c.sessions.map((s) => s.vaccine).filter(Boolean)).join(" ") ||
        "Not specified",
      min_age_limit: uniq(c.sessions.map((s) => s.min_age_limit)),
      available_capacity: uniq(c.sessions.map((s) => s.available_capacity)),
      dates_available: uniq(c.sessions.map((s) => s.date))
    };
  });
}

function check() {
  return fetch(cowinUrl, {
    headers: {
      accept: "application/json, text/plain, */*",
      "accept-language": "en-US,en;q=0.9",
      authorization,
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua":
        '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
      "sec-ch-ua-mobile": "?0",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site"
    },
    referrer: "https://selfregistration.cowin.gov.in/",
    referrerPolicy: "strict-origin-when-cross-origin",
    body: null,
    method: "GET"
  })
    .then((res) => res.json())
    .then((json) => {
      sendToSlack("Processing");
      const slots = extractcenters(json);

      if (slots.length) {
        const msg = slots
          .map(
            (s) =>
              `[${s.pin}] ${s.name}. Vaccines: ${
                s.vaccines
              }, Min Age Limit: ${JSON.stringify(
                s.min_age_limit
              )}, Available Capacity ${s.available_capacity}, Dates Available ${
                s.dates_available
              }`
          )
          .join("\n");
        sendToSlack(`Found slots!\n${msg}`);
        return true;
      } else {
        const msg = slots
          .map((s) => `[${s.pin}] ${s.name}. Vaccines: ${s.vaccines}`)
          .join("\n");
        sendToSlack(`Not Found!\n${msg}`);
        return false;
      }
    })
    .catch((error) => {
      console.error(error);
      sendToSlack("Script errored!", error);

      return true;
    });
}

main();
//create a server object:
http
  .createServer(function (req, res) {
    res.write(
      `<html><head></head><body>For whatsapp notifications for a vaccination slot near you - <a href="https://api.whatsapp.com/send?phone=+919987956664&text=find">Whatsapp COWINSLOTS</a> </body> </html>`
    ); //write a response to the client
    res.end(); //end the response
  })

  .listen(8080); //the server object listens on port 8080
