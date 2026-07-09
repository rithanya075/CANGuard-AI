# CANGuard-AI

## AI-Powered CAN Bus Intrusion Detection System for Automotive Cybersecurity

CANGuard-AI is an intrusion detection system (IDS) developed to improve the security of automotive Controller Area Network (CAN) communication. The project monitors CAN traffic in real time, detects malicious activities such as spoofing, replay, and flooding attacks, and provides an interactive web dashboard for traffic analysis, alert visualization, and system monitoring.

The system combines embedded hardware, backend services, and a modern web interface to demonstrate an end-to-end automotive cybersecurity solution.

---

## Features

- Real-time CAN Bus traffic monitoring
- Detection of Spoofing, Replay, and Flooding attacks
- Authentication-based message validation
- Traffic logging using SQLite
- RESTful API built with Flask
- Interactive dashboard developed using React and TypeScript
- Hardware integration using Arduino UNO and MCP2515 CAN controller
- Modular IDS architecture for future attack detection extensions

---

## Technology Stack

### Frontend
- React
- TypeScript
- CSS

### Backend
- Python
- Flask
- Flask-CORS

### Database
- SQLite

### Hardware
- Arduino UNO
- MCP2515 CAN Controller

### Communication Protocol
- CAN Bus

---

## System Architecture

```
CAN Bus Network
        │
        ▼
Arduino + MCP2515
        │
        ▼
Intrusion Detection Engine
        │
        ▼
SQLite Database
        │
        ▼
Flask REST API
        │
        ▼
React Dashboard
```

---

## Project Structure

```
CANGuard-AI
│
├── arduino/              Hardware communication code
├── dashboard/            Flask backend and REST APIs
├── frontend/             React dashboard application
├── ids/                  Intrusion detection modules
├── logs/                 Database and generated logs
├── requirements.txt      Python dependencies
└── README.md
```

---

## Attack Detection Capabilities

The current implementation detects the following attack categories:

- CAN Message Spoofing
- Replay Attacks
- Flooding / Denial of Service (DoS)

Each detected event records:

- Timestamp
- CAN Identifier
- Attack Type
- Confidence Level
- Detection Details
- Source Node Information

---

## Dashboard Modules

The web dashboard provides:

- System Overview
- Traffic Analysis
- Intrusion Detection Statistics
- Alert Management
- Threat Intelligence
- Hardware Status Monitoring
- Fleet Overview
- System Configuration

---

## Installation

### Clone the repository

```bash
git clone https://github.com/rithanyaaa075/CANGuard-AI.git
cd CANGuard-AI
```

### Install Python dependencies

```bash
pip install -r requirements.txt
```

### Run the backend

```bash
cd dashboard
python app.py
```

### Run the Intrusion Detection Engine

```bash
cd ids
python main.py
```

### Run the frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Future Enhancements

- Machine Learning based anomaly detection
- PostgreSQL integration
- Docker containerization
- Cloud deployment
- Real vehicle CAN Bus integration
- User authentication and role-based access control
- Live CAN traffic visualization

---

## Author

**Rithanya S**

B.Tech in Cyber Security

SRM Institute of Science and Technology

---

## License

This project is intended for educational and research purposes.
