const http = require("http");
const fs = require("fs");
const packageFile = require("./package.json");
var speedTest = require('speedtest-net');

var Accessory, Service, Characteristic, UUIDGen;

const PLUGIN_NAME = "homebridge-internet-speed-platform";
const PLATFORM_NAME = "HomebridgeNetworkSpeed";

//const UplinkNetworkSpeedAccessory = require("uplinkNetworkSpeed");
//const DownlinkNetworkSpeedAccessory = require("DownlinkNetworkSpeed");

module.exports = function(homebridge) {
  if (
    !isConfig(homebridge.user.configPath(), "accessories", "UplinkNetworkSpeed")
  ) {
    return;
  }

  console.log("homebridge API version: " + homebridge.version);

  // Accessory must be created from PlatformAccessory Constructor
  Accessory = homebridge.platformAccessory;

  // Service and Characteristic are from hap-nodejs
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  UUIDGen = homebridge.hap.uuid;

  homebridge.registerAccessory(
    PLUGIN_NAME,
    "UplinkNetworkSpeed",
    UplinkNetworkSpeed
  );
  homebridge.registerAccessory(
    PLUGIN_NAME,
    "DownlinkNetworkSpeed",
    DownlinkNetworkSpeed
  );
  //homebridge.registerAccessory(PLUGIN_NAME, 'InternetSpeed', DownlinkNetworkSpeedAccessory);
};

function isConfig(configFile, type, name) {
  var config = JSON.parse(fs.readFileSync(configFile));
  if ("accessories" === type) {
    var accessories = config.accessories;
    for (var i in accessories) {
      if (accessories[i]["accessory"] === name) {
        return true;
      }
    }
  } else if ("platforms" === type) {
    var platforms = config.platforms;
    for (var i in platforms) {
      if (platforms[i]["platform"] === name) {
        return true;
      }
    }
  }
  return false;
}

function UplinkNetworkSpeed(log, config) {
  if (null == config) {
    return;
  }

  this.log = log;
  this.name = config["name"];
}

function DownlinkNetworkSpeed(log, config) {
  if (null == config) {
    return;
  }

  this.log = log;
  this.name = config["name"];
}

let test;
let up;
let down;
test = speedTest({maxTime: 5000});
  test.on('data', data => {
    up = data.speeds.upload;
    down = data.speeds.download;
  });
setInterval(() => {
  console.log("Scheduling test.")
  test = speedTest({maxTime: 5000});
  test.on('data', data => {
    up = data.speeds.upload;
    down = data.speeds.download;
  });
}, 360000);


const getGenericServicesFor = function(direction, measurementFunction) { 
  return function() {
    var that = this;

    var infoService = new Service.AccessoryInformation();
    infoService
      .setCharacteristic(Characteristic.Manufacturer, "N/A")
      .setCharacteristic(Characteristic.Model, direction + "wards internet speed meter")
      .setCharacteristic(Characteristic.SerialNumber, "N/A")
      .setCharacteristic(Characteristic.FirmwareRevision, packageFile.version);

    var upSpeedService = new Service.TemperatureSensor(that.name);
    upSpeedService.getCharacteristic(Characteristic.CurrentTemperature)
                .setProps({
                  minValue: 0,
                  maxValue: 1000
                });
    var upCharacteristic = upSpeedService.getCharacteristic(Characteristic.CurrentTemperature);
    upCharacteristic.updateValue(0);
    
    let oldUp;
    let oldDown;
    setInterval(() => {
      if(oldUp != up || oldDown != down){
        oldUp = up;
        oldDown = down;
        this.log("Up ", up , "Mbps | Dn " , down, "Mbps");
        upCharacteristic.updateValue(measurementFunction());        
      } else {
        //this.log(".")
      }
    }, 1000)

    upCharacteristic.on('get', (callback) => {
      callback(null, measurementFunction());
    });

    return [infoService, upSpeedService];
  }; 
}

UplinkNetworkSpeed.prototype = {
  getServices: getGenericServicesFor("up", () => {
    return up || 0;
  })
};

DownlinkNetworkSpeed.prototype = {
  getServices: getGenericServicesFor("down", () => {
    return down || 0;
  })
}