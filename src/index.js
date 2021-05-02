var http = require("http");
const storage = require("node-persist");
var fs = require("fs");
const url = require("url");

//creating the first table
var obj = {
  table: []
};
//convert the json to a file

var fetch = require("node-fetch");
const { stringify } = require("querystring");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

const slackWebhookUrl =
  "https://hooks.slack.com/services/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"; // Your Slack webhook URL
//const slackWebhookUrl = "https://timberwolf-mastiff-9776.twil.io/demo-reply";
const authorization = ""; // Bearer auth string
const cowinUrl =
  "https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=395&date=01-05-2021";

function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}

async function main() {
  storage.init();
  while (true) {
    const d = new Date();
    console.log("Checking at", d.toLocaleTimeString());
    const changed = await check();
    //if (changed) {
    //   break;
    // }
    // sleep for 5 mins
    await sleep(3600000);
  }
}

async function sendToSlack(message) {
  fs.readFile("mynumber.json", "utf8", function readFileCallback(err, data) {
    if (err) {
      console.log("couldnt read file");
    } else {
      obj = JSON.parse(data); //now it an object
      var data1 = obj.table;
      data1.forEach((tbl) => {
        client.messages.create({
          from: "whatsapp:+14155238886",
          body: message,
          to: "whatsapp:+91" + tbl.number
        });
        console.log("sent message to " + tbl.number);
      });
    }
  });

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

async function sendToSlackOnce(number, message) {
  client.messages.create({
    from: "whatsapp:+14155238886",
    body: message,
    to: "whatsapp:+91" + number
  });

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
      //sendToSlack("Processing");
      const slots = extractcenters(json);

      if (slots.length) {
        const msg = slots
          .map(
            (s) =>
              `\nPin Code:[${s.pin}] \n${s.name}\nVaccines: ${
                s.vaccines
              },\nMin Age Limit: ${JSON.stringify(
                s.min_age_limit
              )},\nAvailable Capacity: ${
                s.available_capacity
              },\nDates Available: ${s.dates_available}`
          )
          .join("\n");
        sendToSlack(
          `Found slots!\n${msg}\n\nShare this link with your loved ones so they know when a vaccination center is available nearby https://pe3rn.sse.codesandbox.io/`
        );
        return true;
      } else {
        return false;
      }
    })
    .catch((error) => {
      console.error(error);
      sendToSlack("Script errored!", error);
      return true;
    });
}

function checkonce(number) {
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
      //sendToSlack("Processing");
      const slots = extractcenters(json);

      if (slots.length) {
        const msg = slots
          .map(
            (s) =>
              `\nPin Code:[${s.pin}] \n${s.name}\nVaccines: ${
                s.vaccines
              },\nMin Age Limit: ${JSON.stringify(
                s.min_age_limit
              )},\nAvailable Capacity: ${
                s.available_capacity
              },\nDates Available: ${s.dates_available}`
          )
          .join("\n");
        sendToSlackOnce(
          number,
          `Found slots!\n${msg}\n\nShare this link with your loved ones so they know when a vaccination center is available nearby https://pe3rn.sse.codesandbox.io/`
        );
        return true;
      } else {
        return false;
      }
    })
    .catch((error) => {
      console.error(error);
      sendToSlack("Script errored!", error);
      return true;
    });
}

function length(obj) {
  return Object.keys(obj).length;
}

main();
//create a server object:
http
  .createServer(function (req, res) {
    let ln = length(obj.table);
    console.log("starting table length" + ln);
    if (req.method === "GET") {
      const queryObject = url.parse(req.url, true).query;
      //landing page html
      if (!("phone" in queryObject)) {
        res.writeHead(200, { "Content-Type": "text/html" });
        fs.createReadStream("./public/index.html", "UTF-8").pipe(res);
      } else {
        //user added phone number, first find out length of table
        console.log(queryObject.phone);
        fs.readFile("mynumber.json", "utf8", function readFileCallback(
          err,
          data
        ) {
          if (err) {
            console.log("couldnt read file");
          } else {
            obj = JSON.parse(data); //now it an object
            let lnn = ln + 1;
            console.log("right before push table length" + lnn);
            obj.table.push({ id: lnn, number: JSON.parse(queryObject.phone) }); //add some data
            fs.writeFile("mynumber.json", JSON.stringify(obj), function () {
              console.log("saved json in file complete");
            });
          }
        });
        res.writeHead(200, { "Content-Type": "text/html" });
        fs.createReadStream("./public/whatsapp.html", "UTF-8").pipe(res);
        sleep(60000);
        checkonce(JSON.parse(queryObject.phone)); //console.log(storage.getItem(ln));
      }
      //phone number registration html
    } else if (req.method === "POST") {
      var body = "";
      req.on("data", function (chunk) {
        body += chunk;
      });
      req.on("end", function () {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(body);
      });
    }
  })
  .listen(8080); //the server object listens on port 8080
