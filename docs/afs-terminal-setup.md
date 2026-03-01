# AFS Card Terminal - Local Daemon Setup

## Overview

The POS runs in a web browser which cannot directly communicate with the AFS Nexgo card terminal (HTTPS on local network, CORS restrictions). A small local service (daemon) running on the POS computer acts as a proxy.

```
Browser (POS)                Local Daemon              AFS Terminal
    |                        (localhost:3001)         (172.28.28.26:21105)
    |-- POST /pay-card ----->|                          |
    |   {amount: 5.500}      |-- HTTPS POST ---------->|
    |                        |   apex.smartpos.gateway  |
    |                        |<-- response -------------|
    |<-- {success, ref} -----|                          |
```

## Daemon Requirements

The local daemon (already used for silent printing at `localhost:3001`) needs a new `/pay-card` endpoint.

### Endpoint: `POST /pay-card`

**Request:**
```json
{
  "amount": 5.500,
  "currency": "OMR"
}
```

**Response (success):**
```json
{
  "success": true,
  "reference": "AFS-TXN-123456"
}
```

**Response (failure):**
```json
{
  "success": false,
  "error": "Card declined"
}
```

### AFS Terminal Configuration

| Setting | Value |
|---------|-------|
| Package | `cn.nexgo.aeafs` |
| SDK Version | `v3.08.011_20251011` |
| Domain | `https://172.28.28.26:21105` |
| Service Path | `apex.smartpos.gateway/` |
| Connection | USB to POS computer |

### Implementation Notes

1. The daemon should forward the amount to the AFS gateway using the Nexgo SDK
2. The daemon should accept self-signed certificates (local network terminal)
3. Timeout: Allow up to 30 seconds for card swipe/tap
4. Return the transaction reference from AFS response
5. The daemon already runs on `localhost:3001` for print services — add the `/pay-card` route to the same service

### Health Check

The daemon should respond to `GET /health` with status 200 (already implemented for print service).
