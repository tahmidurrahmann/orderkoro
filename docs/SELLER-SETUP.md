# Seller Onboarding Guide / সেলার অনবোর্ডিং নির্দেশিকা (`docs/SELLER-SETUP.md`)

This guide explains how a seller prepares their Google Sheet, Telegram notification group, and product details for a high-converting single-product Cash on Delivery (COD) order page.

---

## English Guide

### 1. Google Sheet Setup
1. Create a blank Google Sheet in Google Drive.
2. Name the sheet after your brand or product (e.g. `Bunon - Panjabi Orders`).
3. Click the **Share** button in the top right corner.
4. Add the agency service account email (ask your developer for the exact `@...iam.gserviceaccount.com` email address) and set the permission role to **Editor**.
5. Copy the Sheet URL and send it to your developer.

#### 25-Column Sheet Header Row (Copy & Paste into Row 1, Columns A to Y):
| Col | Header | Description |
|---|---|---|
| A | `Order No` | Order number (e.g. `BNN-0001`) |
| B | `Created At` | Dhaka timestamp in ISO format |
| C | `Status` | Current order status (`new`, `confirmed`, `shipped`, `delivered`, `cancelled`) |
| D | `Name` | Customer full name |
| E | `Phone` | Customer 11-digit mobile number |
| F | `Address` | Customer detailed delivery address |
| G | `District` | Selected Bangladesh district |
| H | `Zone` | Delivery zone ID |
| I | `Product` | Product title |
| J | `Color` | Selected garment color |
| K | `Size` | Selected garment size |
| L | `Qty` | Ordered quantity |
| M | `Unit Price` | Single item price in BDT |
| N | `Delivery Fee` | Delivery charge in BDT |
| O | `COD Total` | Total payable amount in BDT |
| P | `Note` | Customer special instructions |
| Q | `Confirmation Mode` | Order confirmation mode (`call` or `tap`) |
| R | `UTM Source` | Facebook Ad campaign source |
| S | `UTM Medium` | Ad medium |
| T | `UTM Campaign` | Campaign name |
| U | `UTM Content` | Ad creative identifier |
| V | `UTM Term` | Ad audience target |
| W | `fbclid` | Facebook click ID |
| X | `_fbp` | Meta Pixel browser cookie |
| Y | `_fbc` | Meta Pixel click cookie |

---

### 2. Telegram Order Alerts Group
1. Create a new Telegram group for your order management team.
2. Add the shared bot (ask your developer for the bot username, e.g. `@MyStoreOrderBot`).
3. Send `/start` inside the group.
4. The bot will reply with your group's **Chat ID** (e.g. `-1005233056020`).
5. Send this Chat ID to your developer.

---

### 3. What to Send Your Developer
1. **Product Photos:** 3 to 8 high-resolution photos (front view, fabric texture, styling, size chart if available).
2. **Pricing & Sizing:** Product price, regular price (if discount), available sizes (e.g. M, L, XL), and colors.
3. **Delivery Charges:** Delivery fee for Dhaka City, Dhaka Suburbs, and Outside Dhaka, plus free delivery threshold.
4. **Contact Details:** Official customer support phone number and Facebook Page username for Messenger (`m.me/yourpage`).
5. **Meta Pixel ID (Optional):** Numeric Facebook Pixel ID from Events Manager if running ads.

---

## বাংলা নির্দেশিকা (Bangla Guide)

### ১. গুগল শিট তৈরি ও শেয়ারিং
১. আপনার গুগল ড্রাইভে গিয়ে একটি নতুন গুগল শিট (Google Sheet) তৈরি করুন।
২. শিটটির নাম দিন আপনার ব্র্যান্ডের নামে (যেমন: `বুনন - পাঞ্জাবি অর্ডার্স`)।
৩. শিটের উপরে ডানপাশের **Share** বাটনে ক্লিক করুন।
৪. ডেভেলপার কর্তৃক প্রদত্ত সার্ভিস অ্যাকাউন্ট ইমেইলটি (যেমন: `...@...iam.gserviceaccount.com`) পেস্ট করুন এবং পারমিশন **Editor** সিলেক্ট করে শেয়ার করুন।
৫. শিটটির লিংক কপি করে আপনার ডেভেলপারকে পাঠিয়ে দিন।

#### ২৫টি কলামের হেডার রো (Row 1-এ কপি করে পেস্ট করুন):
`Order No	Created At	Status	Name	Phone	Address	District	Zone	Product	Color	Size	Qty	Unit Price	Delivery Fee	COD Total	Note	Confirmation Mode	UTM Source	UTM Medium	UTM Campaign	UTM Content	UTM Term	fbclid	_fbp	_fbc`

---

### ২. টেলিগ্রাম অর্ডার নোটিফিকেশন গ্রুপ
১. টেলিগ্রামে আপনার ডেলিভারি ও সেলস টিমের জন্য একটি নতুন গ্রুপ খুলুন।
২. ডেভেলপার থেকে বটের ইউজারনেম নিয়ে গ্রুপে বটটিকে যুক্ত করুন।
৩. গ্রুপে `/start` লিখে মেসেজ পাঠান।
৪. বটটি আপনার গ্রুপের **Chat ID** জানিয়ে দেবে (যেমন: `-1005233056020`)।
৫. এই Chat ID-টি কপি করে ডেভেলপারকে পাঠান।

---

### ৩. ডেভেলপারকে যা যা পাঠাতে হবে
১. **পণ্যের ছবি:** ৩ থেকে ৮টি পরিষ্কার ও হাই-কোয়ালিটি ছবি (সামনের ভিউ, কাপড়ের ক্লোজআপ, সাইজ চার্ট ইত্যাদি)।
২. **মূল্য ও সাইজ:** বিক্রয়মূল্য, পূর্বের মূল্য (যদি ছাড় থাকে), সাইজসমূহ (M, L, XL ইত্যাদি) এবং কালারসমূহ।
৩. **ডেলিভারি চার্জ:** ঢাকা সিটি, ঢাকা সাব-অার্ব এবং ঢাকার বাইরের ডেলিভারি চার্জ। কত টাকার অর্ডারে ফ্রি ডেলিভারি দিতে চান তা উল্লেখ করুন।
৪. **যোগাযোগের তথ্য:** হেল্পলাইন মোবাইল নম্বর এবং ফেসবুক পেজের ইউজারনেম (যাতে কাস্টমার মেসেঞ্জারে মেসেজ দিতে পারে)।
৫. **মেটা পিক্সেল আইডি (ঐচ্ছিক):** ফেসবুক বিজ্ঞাপনের জন্য আপনার মেটা পিক্সেল আইডি (Meta Pixel ID)।
