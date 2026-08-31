# MyApp App IA (Information Architecture)

## Auth

- Login (RN)
- Sign Up (RN)
- Forgot Password (RN)

---

## Tabs

# 1) Home

## Home Dashboard (RN)

- Device Add Entry (RN)
- Cleaning Schedule (RN)
- Live View (RN)

## Device Registration Flow (RN)

- Device Add Start (RN)
- Wi-Fi Input / SoftAP (RN)
- Device Connecting (RN)
- Device Setup Complete (RN)

---

# 2) Notifications

## Notification Center (RN)

### Health

- Health Analysis (WebView Entry)
  - Health Detail / Charts (WebView Internal)

### Device Alerts

- Device Alerts (WebView Entry)
  - Alerts List (WebView Internal)
  - Alert Detail (WebView Internal)

### Elimination Records

- Elimination Records (WebView Entry)
  - Record List (WebView Internal)
  - Record Detail (WebView Internal)
    - Event Video Player (WebView Internal)
  - Timeline / Memo Editor (WebView Internal) _(optional)_

---

# 3) Profile

## Profile Home (RN)

- Profile Info (RN)
- Notification Settings (RN)
- App Settings (RN)

### Account Management

- Personal Data (RN)
- Add Phone Number (RN)
- Change Password (RN)

### Preferences

- Language Settings (RN)
- System Permissions (RN)

### Notification Preferences

- Message Preferences (RN)

### Device Management

- Device Info (RN)
- Device Logs (WebView Internal)
- Advanced Device Settings (WebView Internal)

### Statistics

- Statistics Entry (WebView Entry)
  - Stats Overview (WebView Internal)
  - Pattern Insights (WebView Internal)

### Help Center

- Help Center Entry (WebView Entry)
  - Announcements (WebView Internal)
  - Guides & Tutorials (WebView Internal)
  - FAQ (WebView Internal)
  - Terms & Privacy Policy (WebView Internal)

### Support

- Contact Us (RN)
- Feedback (RN)

### App Info

- About App (RN)
- Company Profile (WebView Internal)
- User Agreement (WebView Internal)

### Other

- More Settings (RN)

아래는 **MyApp App 전체 페이지에 대한 route pathname 표**다.
Expo Router 규칙(SDK 54, Router v6)을 기준으로 작성했으며,
RN Screen / WebView(Entry) / WebView(Internal) 모두 포함했다.

---

# 🗂️ **MyApp 전체 Route Pathname 표**

형식:

| 대분류 | 페이지 이름 | 구현 | Route Path (pathname) |
| ------ | ----------- | ---- | --------------------- |

---

# 🔐 **Auth**

| 대분류 | 페이지          | 구현 | Route              |
| ------ | --------------- | ---- | ------------------ |
| Auth   | Login           | RN   | `/login`           |
| Auth   | Sign Up         | RN   | `/signup`          |
| Auth   | Forgot Password | RN   | `/forgot-password` |

> 실제 구조는 `(auth)/` 그룹 내부지만, pathname은 위와 같이 처리됨.

---

# 🏠 **Home 탭**

## Device Registration Flow

| 대분류          | 페이지           | 구현 | Route                              |
| --------------- | ---------------- | ---- | ---------------------------------- |
| Home / Register | Device Add Start | RN   | `/home/device-register`            |
| Home / Register | Wi-Fi Input      | RN   | `/home/device-register/wifi`       |
| Home / Register | Connecting       | RN   | `/home/device-register/connecting` |
| Home / Register | Complete         | RN   | `/home/device-register/complete`   |

## Home Dashboard & Device Control

| 대분류 | 페이지            | 구현 | Route               |
| ------ | ----------------- | ---- | ------------------- |
| Home   | Home Dashboard    | RN   | `/home`             |
| Home   | Cleaning Schedule | RN   | `/home/schedule`    |
| Home   | Live View         | RN   | `/home/live`        |
| Home   | Live Stream       | RN   | `/home/live/stream` |

---

# 🔔 **Notifications 탭**

## Notification Hub

| 대분류        | 페이지              | 구현 | Route            |
| ------------- | ------------------- | ---- | ---------------- |
| Notifications | Notification Center | RN   | `/notifications` |

---

## Health

| 대분류                 | 페이지          | 구현              | Route                          |
| ---------------------- | --------------- | ----------------- | ------------------------------ |
| Notifications / Health | Health Analysis | WebView(Entry)    | `/notifications/health`        |
| Notifications / Health | Health Detail   | WebView(Internal) | `/notifications/health/detail` |

---

## Device Alerts

| 대분류                 | 페이지              | 구현              | Route                                    |
| ---------------------- | ------------------- | ----------------- | ---------------------------------------- |
| Notifications / Alerts | Device Alerts Entry | WebView(Entry)    | `/notifications/device-alerts`           |
| Notifications / Alerts | Alert List          | WebView(Internal) | `/notifications/device-alerts/list`      |
| Notifications / Alerts | Alert Detail        | WebView(Internal) | `/notifications/device-alerts/[alertId]` |

---

## Elimination Records

(Entry 1개, Detail/Internal은 WebView 내부 이동)

| 대분류                  | 페이지                   | 구현              | Route                                       |
| ----------------------- | ------------------------ | ----------------- | ------------------------------------------- |
| Notifications / Records | Records Entry            | WebView(Entry)    | `/notifications/records`                    |
| Notifications / Records | Record List (Internal)   | WebView(Internal) | `/notifications/records/list`               |
| Notifications / Records | Record Detail (Internal) | WebView(Internal) | `/notifications/records/[eventId]`          |
| Notifications / Records | Video Player (Internal)  | WebView(Internal) | `/notifications/records/[eventId]/video`    |
| Notifications / Records | Memo/Timeline (Internal) | WebView(Internal) | `/notifications/records/[eventId]/timeline` |

---

# 👤 **Profile 탭**

## Profile / Settings

| 대분류  | 페이지                | 구현 | Route                            |
| ------- | --------------------- | ---- | -------------------------------- |
| Profile | Profile Home          | RN   | `/profile`                       |
| Profile | Profile Info          | RN   | `/profile/info`                  |
| Profile | Notification Settings | RN   | `/profile/notification-settings` |
| Profile | App Settings          | RN   | `/profile/app-settings`          |

## Account Management

| 대분류            | 페이지           | 구현 | Route                            |
| ----------------- | ---------------- | ---- | -------------------------------- |
| Profile / Account | Personal Data    | RN   | `/profile/account/personal-data` |
| Profile / Account | Add Phone Number | RN   | `/profile/account/phone`         |
| Profile / Account | Change Password  | RN   | `/profile/account/password`      |

## Preferences

| 대분류                | 페이지             | 구현 | Route                              |
| --------------------- | ------------------ | ---- | ---------------------------------- |
| Profile / Preferences | Language Settings  | RN   | `/profile/preferences/language`    |
| Profile / Preferences | System Permissions | RN   | `/profile/preferences/permissions` |

## Notification Preferences

| 대분류                  | 페이지              | 구현 | Route                                        |
| ----------------------- | ------------------- | ---- | -------------------------------------------- |
| Profile / Notifications | Message Preferences | RN   | `/profile/notifications/message-preferences` |

---

## Device Management

| 대분류           | 페이지            | 구현              | Route                      |
| ---------------- | ----------------- | ----------------- | -------------------------- |
| Profile / Device | Device Info       | RN                | `/profile/device`          |
| Profile / Device | Device Logs       | WebView(Internal) | `/profile/device/logs`     |
| Profile / Device | Advanced Settings | WebView(Internal) | `/profile/device/advanced` |

---

## Statistics

| 대분류               | 페이지           | 구현              | Route                          |
| -------------------- | ---------------- | ----------------- | ------------------------------ |
| Profile / Statistics | Statistics Entry | WebView(Entry)    | `/profile/statistics`          |
| Profile / Statistics | Stats Overview   | WebView(Internal) | `/profile/statistics/overview` |
| Profile / Statistics | Pattern Insights | WebView(Internal) | `/profile/statistics/patterns` |

---

## Help Center

| 대분류         | 페이지                 | 구현              | Route                  |
| -------------- | ---------------------- | ----------------- | ---------------------- |
| Profile / Help | Help Center Entry      | WebView(Entry)    | `/profile/help`        |
| Profile / Help | Announcements          | WebView(Internal) | `/profile/help/notice` |
| Profile / Help | Guides & Tutorials     | WebView(Internal) | `/profile/help/guide`  |
| Profile / Help | FAQ                    | WebView(Internal) | `/profile/help/faq`    |
| Profile / Help | Terms & Privacy Policy | WebView(Internal) | `/profile/help/policy` |

---

## Support

| 대분류            | 페이지     | 구현 | Route                       |
| ----------------- | ---------- | ---- | --------------------------- |
| Profile / Support | Contact Us | RN   | `/profile/support/contact`  |
| Profile / Support | Feedback   | RN   | `/profile/support/feedback` |

---

## App Info

| 대분류             | 페이지          | 구현              | Route                         |
| ------------------ | --------------- | ----------------- | ----------------------------- |
| Profile / App Info | About App       | RN                | `/profile/app-info/about`     |
| Profile / App Info | Company Profile | WebView(Internal) | `/profile/app-info/company`   |
| Profile / App Info | User Agreement  | WebView(Internal) | `/profile/app-info/agreement` |

---
