const { test, expect } = require("@playwright/test");
import * as setup_utils from "../utils/setup.js"
import * as utils from "../utils/functions.js"

let chartServer
let chartClient
let dbConnection

test.beforeEach(async () => {

  if (chartServer) {
    chartServer.forceShutdown();
    console.log("shutting down the server")
  }

  const port = 50051

  chartServer = await setup_utils.initServerAndService()
  await setup_utils.bindServer(chartServer, port)
  chartClient = await setup_utils.initClient()
  
  dbConnection = await utils.connectDb()

})

test("should check for the preexisting records", async () => {

  const alreadyExistingCheck = await utils.checkForPreexistingRecords(dbConnection, "VOO", 1672549200000 )

  if (!alreadyExistingCheck) {
  const call = chartClient.Subscribe({
    symbol_list: ["VOO"],
    timeframe: 0,
  });

  const responses = [];
  for await (const response of call) {
    responses.push(response);
  }

  expect(responses[0]).toHaveProperty('symbol');
  expect(responses[0]).toHaveProperty('bar');

} 
  
});

test("should return the correct response format", async () => {

  await utils.checkForPreexistingRecords(dbConnection, "VOO", Math.floor(Date.now() / 100) )

  const call = chartClient.Subscribe({
    symbol_list: ["VOO"],
    timeframe: "TIMEFRAME_MINUTE_1",
  });

  const responses = [];
  for await (const response of call) {
    responses.push(response);
  }

  expect(responses[0]).toHaveProperty('symbol');
  expect(responses[0]).toHaveProperty('bar');
  expect(responses[0].bar).toHaveProperty('timestamp_msec');
  expect(responses[0].bar).toHaveProperty('open');
  expect(responses[0].bar).toHaveProperty('high');
  expect(responses[0].bar).toHaveProperty('low');
  expect(responses[0].bar).toHaveProperty('close');
  
});

test("should gracefully handle tickers without any data", async () => {

  await utils.checkForPreexistingRecords(dbConnection, "VOO", Math.floor(Date.now() / 100) )

  const call = chartClient.Subscribe({
    symbol_list: ["NO_DATA"],
    timeframe: "TIMEFRAME_MINUTE_1",
  });

  const responses = [];
  for await (const response of call) {
    responses.push(response);
  }

  expect(typeof responses[0].bar.timestamp_msec).toBe('string')
  expect(responses[0].bar.timestamp_msec).toHaveLength(11)

  expect(responses[0].bar.open).toBe(0)
  expect(responses[0].bar.high).toBe(0)
  expect(responses[0].bar.low).toBe(0)
  expect(responses[0].bar.close).toBe(0)
  
});

test("should return valid candlestick data", async () => {

  await utils.checkForPreexistingRecords(dbConnection, "VOO", Math.floor(Date.now() / 100) )

  const call = chartClient.Subscribe({
    symbol_list: ["VOO"],
    timeframe: 0,
  });

  const responses = [];
  for await (const response of call) {
    responses.push(response);
  }


  expect(typeof responses[0].bar.timestamp_msec).toBe('string')
  expect(responses[0].bar.timestamp_msec).toHaveLength(11)

  expect(typeof responses[0].bar.open).toBe('number')
  expect(typeof responses[0].bar.high).toBe('number')
  expect(typeof responses[0].bar.low).toBe('number')
  expect(typeof responses[0].bar.close).toBe('number')

  expect(responses[0].bar.high).toBeGreaterThanOrEqual(responses[0].bar.low)
  expect(responses[0].bar.high).toBeGreaterThanOrEqual(responses[0].bar.open)
  expect(responses[0].bar.high).toBeGreaterThanOrEqual(responses[0].bar.close)

  expect(responses[0].bar.low).toBeLessThanOrEqual(responses[0].bar.open)
  expect(responses[0].bar.low).toBeLessThanOrEqual(responses[0].bar.close)
  
  
});


test("should return the correct number of responses", async () => {

  await utils.checkForPreexistingRecords(dbConnection, "VOO", Math.floor(Date.now() / 100) )

  const call = chartClient.Subscribe({
    symbol_list: ["VOO", "AAPL", "IXUS"],
    timeframe: 0,
  });

  const responses = [];
  for await (const response of call) {
    responses.push(response);
  }

  expect(responses).toHaveLength(3);
  expect(responses[0].symbol).toBe("VOO");
  expect(responses[1].symbol).toBe("AAPL");
  expect(responses[2].symbol).toBe("IXUS");


});

// failing test - genuine issue
test.skip("should return only one object if duplicate tickers are provided", async () => {

  const call = chartClient.Subscribe({
    symbol_list: ["VOO", "VOO"],
    timeframe: 0,
  });

  const responses = [];
  for await (const response of call) {
    responses.push(response);
  }

  expect(responses[0].symbol).toBe("VOO");
  expect(responses).toHaveLength(1);

});

// not sure about the expected result
test("should fail if the symbol_list is partially invalid", async () => {

  const call = chartClient.Subscribe({
    symbol_list: ["VOO", "AAA"],
    timeframe: 0,
  });

  const responses = [];
  for await (const response of call) {
    responses.push(response);
  }

  expect(responses).toHaveLength(0);

});

// needs improvement - error is expected
[
  { symbol_list: '', description: "empty string"},
  { symbol_list: [], description: "empty array"},
  { symbol_list: null, description: "null value"},
  { symbol_list: undefined, description: "undefined value"},
].forEach(({ symbol_list, description }) => {
test.skip(`should return no responses for an empty or falsy symbol list - ${description}`, async () => {

  const call = chartClient.Subscribe({
    symbol_list: symbol_list,
    timeframe: "TIMEFRAME_MINUTE_1",
  });

  const responses = [];
  for await (const response of call) {
    responses.push(response);
  }

  expect(responses).toHaveLength(0);
})
});

// needs improvement - error is expected
test.skip("should fail when invalid ticker(s) are sent", async () => {

  const call = chartClient.Subscribe({
    symbol_list: ["AAA"],
    timeframe: "TIMEFRAME_MINUTE_1",
  });

  const responses = [];
  for await (const response of call) {
    responses.push(response);
  }

  expect(responses).toHaveLength(0);
});


test("should not fail when timeframe is invalid; defaults to TIMEFRAME_UNKNOWN", async () => {

  await utils.checkForPreexistingRecords(dbConnection, "VOO", Math.floor(Date.now() / 100) )

  const call = chartClient.Subscribe({
    symbol_list: ["VOO", "IXUS"],
    timeframe: "TIMEFRAME_INVALID",
  });

  const responses = [];
  for await (const response of call) {
    responses.push(response);
  }

  expect(responses).toHaveLength(2);
  expect(responses[0].symbol).toBe("VOO");
  expect(responses[1].symbol).toBe("IXUS");
});

test("should return a success response when correct index is used", async () => {

  await utils.checkForPreexistingRecords(dbConnection, "VOO", Math.floor(Date.now() / 100) )

  const call = chartClient.Subscribe({
    symbol_list: ["VOO", "IXUS"],
    timeframe: 0,
  });

  const responses = [];
  for await (const response of call) {
    responses.push(response);
  }

  expect(responses).toHaveLength(2);
  expect(responses[0].symbol).toBe("VOO");
  expect(responses[1].symbol).toBe("IXUS");
});

test("should fail when a wrong index is used", async () => {

  const call = chartClient.Subscribe({
    symbol_list: ["VOO", "IXUS"],
    timeframe: 2,
  });

  const responses = [];
  for await (const response of call) {
    responses.push(response);
  }

  expect(responses).toHaveLength(2);
  expect(responses[0].symbol).toBe("VOO");
  expect(responses[1].symbol).toBe("IXUS");
});
