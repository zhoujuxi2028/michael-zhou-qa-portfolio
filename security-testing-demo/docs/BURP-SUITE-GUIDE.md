# Burp Suite Practice Guide

Quick-start guide for using Burp Suite CE with DVWA and Juice Shop.

## Prerequisites

- Burp Suite CE installed: `brew install --cask burp-suite`
- Docker targets running: `docker compose -f docker/docker-compose.yml up -d`

## Target URLs

| Target | URL | Credentials |
|--------|-----|-------------|
| DVWA | http://localhost | admin / password |
| Juice Shop | http://localhost:3000 | - |

## 1. Proxy Setup

### Browser Configuration

1. Open Burp Suite: `/Applications/Burp Suite Community Edition.app`
2. Start with default settings (Temporary project)
3. Go to **Proxy > Options** - default listener: `127.0.0.1:8080`

### Configure Firefox/Chrome

**Firefox (Recommended):**
1. Settings > Network Settings > Manual proxy configuration
2. HTTP Proxy: `127.0.0.1`, Port: `8080`
3. Check "Also use this proxy for HTTPS"

**macOS System Proxy:**
```bash
# Set proxy
networksetup -setwebproxy "Wi-Fi" 127.0.0.1 8080
networksetup -setsecurewebproxy "Wi-Fi" 127.0.0.1 8080

# Disable proxy (after testing)
networksetup -setwebproxystate "Wi-Fi" off
networksetup -setsecurewebproxystate "Wi-Fi" off
```

### Install Burp CA Certificate

1. Browse to http://burp (with proxy enabled)
2. Click "CA Certificate" to download
3. Import to browser/system trust store

## 2. Intercept Module

### Practice: DVWA Login Intercept

1. Enable intercept: **Proxy > Intercept > Intercept is on**
2. Browse to http://localhost/login.php
3. Enter credentials: `admin` / `password`
4. Click Login - request will be intercepted
5. Observe POST parameters in Burp
6. Click **Forward** to continue

**Key observations:**
- `username` and `password` parameters
- `Login` button value
- Session cookie (`PHPSESSID`)

### Practice: Juice Shop Login

1. Browse to http://localhost:3000
2. Click Login
3. Enter: `test@test.com` / `test123`
4. Intercept shows JSON body:
```json
{"email":"test@test.com","password":"test123"}
```

## 3. Repeater Module

### Practice: SQL Injection Testing

1. Intercept a DVWA request with parameter
2. Right-click > **Send to Repeater**
3. Go to **Repeater** tab
4. Modify the parameter value to: `' OR '1'='1`
5. Click **Send**
6. Analyze response for SQL errors or success

### Common Test Payloads

```
# SQL Injection
' OR '1'='1
' OR '1'='1'--
'; DROP TABLE users;--
1 UNION SELECT null,null,null--

# XSS
<script>alert(1)</script>
<img src=x onerror=alert(1)>
"><script>alert(document.domain)</script>

# NoSQL Injection (Juice Shop)
{"email":{"$ne":""},"password":{"$ne":""}}
```

## 4. Intruder Module (Rate Limited in CE)

### Practice: Password Brute Force

1. Intercept login request
2. Right-click > **Send to Intruder**
3. Go to **Intruder** tab
4. **Positions**: Clear all, select password value, click **Add**
5. **Payloads**: Load wordlist or add manually:
   - password
   - admin
   - 123456
   - password123
6. **Start attack** (throttled in CE)

### DVWA Brute Force Target

```
POST /vulnerabilities/brute/ HTTP/1.1
Host: localhost

username=admin&password=§test§&Login=Login
```

## 5. Decoder Module

### Common Encodings

| Encoding | Example |
|----------|---------|
| URL | `%3Cscript%3E` |
| Base64 | `PHNjcmlwdD4=` |
| HTML | `&lt;script&gt;` |

### Practice

1. Go to **Decoder** tab
2. Paste: `<script>alert(1)</script>`
3. Click **Encode as** > URL
4. Result: `%3Cscript%3Ealert(1)%3C%2Fscript%3E`

## 6. Practice Scenarios

### Scenario 1: DVWA XSS (Reflected)

1. Browse to http://localhost/vulnerabilities/xss_r/
2. Enter `<script>alert(1)</script>` in search
3. Intercept and observe how payload is reflected
4. Use Repeater to test variations

### Scenario 2: DVWA SQL Injection

1. Browse to http://localhost/vulnerabilities/sqli/
2. Enter `1` in User ID field
3. Intercept the request
4. Send to Repeater
5. Test payloads: `1' OR '1'='1`, `1 UNION SELECT null,user()--`

### Scenario 3: Juice Shop API Testing

1. Browse Juice Shop, login
2. Check **HTTP history** in Proxy tab
3. Find API calls to `/rest/` or `/api/`
4. Send interesting requests to Repeater
5. Test IDOR: change user IDs, basket IDs

## 7. Tips

### Scope Configuration

Limit Burp to only target hosts:
1. **Target > Scope > Add**
2. Add: `http://localhost` and `http://localhost:3000`
3. **Proxy > Options > Intercept Client Requests**
4. Check "And URL Is in target scope"

### Useful Shortcuts

| Action | Shortcut |
|--------|----------|
| Forward request | Ctrl+F |
| Drop request | Ctrl+D |
| Send to Repeater | Ctrl+R |
| Send to Intruder | Ctrl+I |
| Toggle intercept | Ctrl+T |

### Disable Proxy When Done

```bash
# macOS
networksetup -setwebproxystate "Wi-Fi" off
networksetup -setsecurewebproxystate "Wi-Fi" off
```

## Quick Reference

```bash
# Start environment
docker compose -f docker/docker-compose.yml up -d

# Verify targets
curl -I http://localhost        # DVWA
curl -I http://localhost:3000   # Juice Shop

# Open Burp Suite
open -a "Burp Suite Community Edition"
```
