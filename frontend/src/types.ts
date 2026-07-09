export type VehicleStatus = 'Secure' | 'Active Scan' | 'Alert' | 'Under Attack';

export interface Vehicle {
  vin: string;
  model: string;
  status: VehicleStatus;
  busLoad: number; // percentage
  alertsCount: number;
  silhType: 'sedan' | 'suv' | 'truck' | 'sport';
  ipAddress: string;
  firmwareVersion: string;
  hardwareRev: string;
}

export interface CANFrame {
  id: string; // Unique row ID
  timestamp: string; // relative timestamp e.g. "0.0241"
  busId: 'CAN_0_HS' | 'CAN_1_MS' | 'LIN_BODY';
  frameId: string; // hexadecimal e.g. "0x3B6"
  dlc: number; // data length code, e.g. 8
  payload: string; // "00 FF 2C AC 00 A4"
  interpretation: string; // e.g. "Throttle Position Meter"
  suspicious: boolean;
  alertReason?: string;
}

export interface ThreatIntelItem {
  id: string;
  name: string;
  vector: string;
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  affectedECU: string;
  status: 'Active' | 'Mitigated' | 'Monitoring';
  cve?: string;
}

export type AlertConfidence = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AlertRow {
  id?: string;
  attack_type?: string;
  can_id?: string;
  confidence?: AlertConfidence;
  details?: string;
  timestamp?: string;
  vector?: string;
  status?: string;
  affectedECU?: string;
  cve?: string;
  name?: string;
  criticality?: AlertConfidence;
}

export interface AlertsResponse {
  alerts: AlertRow[];
  total_alerts?: number;
}

export interface TrafficRow {
  timestamp?: string;
  counter?: number;
  can_id?: string;
  attack_type?: string;
  source_node?: string;
  is_alert?: number | boolean;
}

export interface TrafficResponse {
  traffic: TrafficRow[];
  total_records?: number;
}

export interface StatsData {
  total_messages: number;
  total_alerts: number;
  flood_count: number;
  replay_count: number;
  spoof_count: number;
  alert_rate: number;
}

export interface HardwareBoardStatus {
  boardName: string;
  cpuTemp: number; // in Celsius
  cpuUtilization: number; // %
  memUtilization: number; // %
  busErrorFrames: number;
  voltage: number; // V
  status: 'Online' | 'Degraded' | 'Offline';
}

export interface RuleConfig {
  frameId: string;
  mask: string;
  action: 'ALLOW' | 'BLOCK' | 'RATE_LIMIT';
  description: string;
}
