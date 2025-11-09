# dBFT-Based Consensus Implementation (Node.js)

## Overview

This project implements a **Delegated Byzantine Fault Tolerance (dBFT)**-inspired consensus mechanism using **Node.js**.
The system consists of **7 nodes (n0–n6)** running on separate virtual machines, collaboratively reaching consensus even in the presence of a faulty or malicious node.

dBFT ensures **security**, **reliability**, and **energy efficiency** by delegating validation to a set of trusted consensus nodes.

---

## Repository Structure

```
├── n0/                     # Node 0 files
│   ├── n0.js
│   ├── node.js
│   ├── node_modules/
│   ├── package.json
│   └── package-lock.json
├── n1/ ... n6/              # Other node directories
├── send_messages.sh         # Script to send transactions to the cluster
├── PROJECT_REPORT.pdf       # Detailed project report
├── allgoodoutput/           # Sample logs for successful runs
├── singlecrashoutput/       # Logs with single node crash scenario
├── byzfailureoutput/        # Logs simulating Byzantine failure
└── README.md
```

---

## Running the System

### Prerequisites

* Node.js (v16 or above)
* 7 VMs or terminals for running 7 nodes
* Ensure inter-VM network connectivity on the configured ports

---

### Steps

1. **Clone the repository** on all 7 VMs:

   ```bash
   git clone https://github.com/<your-repo>/dbft-nodejs.git
   cd dbft-nodejs
   ```

2. **Install dependencies** (run inside each node folder):

   ```bash
   cd n0
   npm install
   ```

   Repeat for `n1` … `n6`.

3. **Run each node** on its respective VM:

   ```bash
   node n0.js
   ```

   Do the same for other nodes (`n1.js` to `n6.js`) on their respective machines.

4. **Send client messages to the cluster:**
   From the main directory, run:

   ```bash
   bash send_messages.sh
   ```

---

## Notes

* Each node listens on a unique HTTP and P2P port.
* The script `send_messages.sh` simulates client transactions.
* Output logs from different scenarios are stored in:

  * `allgoodoutput/` — all nodes working
  * `singlecrashoutput/` — one node failure
  * `byzfailureoutput/` — Byzantine node behavior


