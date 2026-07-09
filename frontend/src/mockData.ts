import { Vehicle, CANFrame, ThreatIntelItem, HardwareBoardStatus } from './types';

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    vin: "5YJ3E1EA5KF554286",
    model: "Nexus Elite Sedan (S-1)",
    status: "Secure",
    busLoad: 24.5,
    alertsCount: 0,
    silhType: "sedan",
    ipAddress: "10.244.11.102",
    firmwareVersion: "v2.11.4-beta",
    hardwareRev: "H-7.0"
  },
  {
    vin: "1FTFW1ED6KD124901",
    model: "Nexus Armored SUV (M-7)",
    status: "Under Attack",
    busLoad: 89.2,
    alertsCount: 5,
    silhType: "suv",
    ipAddress: "10.244.12.203",
    firmwareVersion: "v2.10.8-stable",
    hardwareRev: "H-7.2"
  },
  {
    vin: "5YJYGDEF6LF098115",
    model: "Heavy Logistics Interceptor",
    status: "Alert",
    busLoad: 58.4,
    alertsCount: 2,
    silhType: "truck",
    ipAddress: "10.244.13.411",
    firmwareVersion: "v1.98.2-secure",
    hardwareRev: "H-6.9"
  },
  {
    vin: "SA9AA2E79KF933804",
    model: "Cyber GT Valkyrie Sport",
    status: "Secure",
    busLoad: 18.1,
    alertsCount: 0,
    silhType: "sport",
    ipAddress: "10.244.10.99",
    firmwareVersion: "v2.11.5-beta",
    hardwareRev: "H-7.5"
  }
];

export const INITIAL_CAN_LOGS: CANFrame[] = [
  {
    id: "f-1",
    timestamp: "0.0010",
    busId: "CAN_0_HS",
    frameId: "0x1A0",
    dlc: 8,
    payload: "01 22 A0 00 FF 00 00 A4",
    interpretation: "Motor Throttle Velocity Vector",
    suspicious: false
  },
  {
    id: "f-2",
    timestamp: "0.0152",
    busId: "CAN_0_HS",
    frameId: "0x3B6",
    dlc: 8,
    payload: "2F 0A D3 BE 10 FF AA 0F",
    interpretation: "Active Suspension Torque",
    suspicious: false
  },
  {
    id: "f-3",
    timestamp: "0.0241",
    busId: "CAN_0_HS",
    frameId: "0x244",
    dlc: 8,
    payload: "FF FF FF FF FF FF FF FF",
    interpretation: "OBD-II Command Diagnostic Flooding",
    suspicious: true,
    alertReason: "Symptom of brute force diagnostic scan. Sequence payload consists of maximal FF values."
  },
  {
    id: "f-4",
    timestamp: "0.0388",
    busId: "CAN_1_MS",
    frameId: "0x0B0",
    dlc: 6,
    payload: "00 C1 AE FD BB 02",
    interpretation: "Airbag Deployment keeps alive telemetry",
    suspicious: false
  },
  {
    id: "f-5",
    timestamp: "0.0450",
    busId: "CAN_0_HS",
    frameId: "0x1A0",
    dlc: 8,
    payload: "01 22 A4 00 FF 00 00 AC",
    interpretation: "Motor Throttle Velocity Vector",
    suspicious: false
  },
  {
    id: "f-6",
    timestamp: "0.0520",
    busId: "LIN_BODY",
    frameId: "0x04F",
    dlc: 4,
    payload: "FA FA 00 A1",
    interpretation: "Passenger Cabin Air Climate Controller",
    suspicious: false
  },
  {
    id: "f-7",
    timestamp: "0.0631",
    busId: "CAN_1_MS",
    frameId: "0x099",
    dlc: 8,
    payload: "D4 EC 01 2A 99 00 1B FE",
    interpretation: "Telematics GPS keep-alive frame injection",
    suspicious: true,
    alertReason: "Mismatched checksum detected on secondary telematics system. High repetition rate."
  },
  {
    id: "f-8",
    timestamp: "0.0712",
    busId: "CAN_0_HS",
    frameId: "0x24C",
    dlc: 8,
    payload: "00 00 C1 CC 00 12 AF BB",
    interpretation: "Active Steering Position Vector",
    suspicious: false
  }
];

export const INITIAL_THREATS: ThreatIntelItem[] = [
  {
    id: "t-1",
    name: "OBD-II Diagnostic Spoofing Scan",
    vector: "CAN Bus Injection / OBD Port access",
    criticality: "CRITICAL",
    timestamp: "2026-06-17 09:12:04",
    affectedECU: "ECU_01_ENG_CTRL",
    status: "Active",
    cve: "CVE-2026-8910"
  },
  {
    id: "t-2",
    name: "HVAC Thermostat Keeps-Alive Hijack",
    vector: "LIN Gateway Spoofing",
    criticality: "LOW",
    timestamp: "2026-06-17 09:05:41",
    affectedECU: "ECU_04_BODY_CTRL",
    status: "Mitigated",
    cve: "CVE-2025-4122"
  },
  {
    id: "t-3",
    name: "Telematic Keep-Alive ID Injection",
    vector: "Remote Cellular OTA Replay",
    criticality: "HIGH",
    timestamp: "2026-06-17 08:52:19",
    affectedECU: "ECU_09_TELEMATICS_COMM",
    status: "Active",
    cve: "CVE-2026-1211"
  },
  {
    id: "t-4",
    name: "Active Suspension Torque Injection",
    vector: "Gateway Replay Vulnerability",
    criticality: "MEDIUM",
    timestamp: "2026-06-17 06:14:00",
    affectedECU: "ECU_02_CHASSIS_SUSP",
    status: "Monitoring"
  }
];

export const INITIAL_BOARDS: HardwareBoardStatus[] = [
  {
    boardName: "CAN Controller (N7-A1)",
    cpuTemp: 44.5,
    cpuUtilization: 32.1,
    memUtilization: 54.0,
    busErrorFrames: 0,
    voltage: 12.04,
    status: "Online"
  },
  {
    boardName: "Secure Gateway Router (N7-X2)",
    cpuTemp: 58.2,
    cpuUtilization: 72.8,
    memUtilization: 68.4,
    busErrorFrames: 114,
    voltage: 11.96,
    status: "Degraded"
  },
  {
    boardName: "Cellular OTA Telematic (N7-W1)",
    cpuTemp: 41.0,
    cpuUtilization: 12.4,
    memUtilization: 28.1,
    busErrorFrames: 0,
    voltage: 12.11,
    status: "Online"
  },
  {
    boardName: "Hardware Security module (HSM-7)",
    cpuTemp: 38.6,
    cpuUtilization: 8.5,
    memUtilization: 19.3,
    busErrorFrames: 0,
    voltage: 5.01,
    status: "Online"
  }
];
