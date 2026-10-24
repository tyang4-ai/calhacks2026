---
type: source
domain: hackathon
hackathon: "Cal Hacks 13.0"
year: 2026
sponsor: "Capital One"
captured: 2026-10-23
tags: [domain/hackathon, type/source, hackathon/cal-hacks, year/2026]
date-created: 2026-10-21
date-modified: 2026-10-24
---

# Capital One · Best Use of Nessie

Everything Capital One published for Cal Hacks 13.0, plus the Nessie API docs, first copied Oct 21, 2026 and updated Oct 23 with Slack and Hive. Re-checked Oct 24: the Devpost prize and the Hacker Guide row are unchanged. Hub: [[cal-hacks-13]] · Spec: [[cindia-spec]] · v2 brief: the repo's `docs/v2/brief.md`

## At a glance

- **Prize:** $300 Giftogram per person on the winning team (Devpost lists it as $1,200 in cash)
- **Criteria:** Completeness, Creativity, Complexity
- **Nessie is optional:** the track is "intentionally vague," and Nessie is an API you "can optionally take advantage of"
- **Challenge (Slack, arko from Capital One, Oct 23):** "Best use of the Nessie API," as announced at the opening ceremony. API and details at https://nessieisreal.com/
- **Event:** a Super Smash Bros Ultimate tournament, Sat 12:00 to 1:00 PM at Gate 4, the same slot as Visa's fireside chat at Gate 3. Sign up at https://forms.gle/d2pMuDu4WUkjSfe27. Slack (Peter Luo, Capital One) says 32 players get picked at random from the form. Hive says 16 spots. Winners, and maybe some audience members, get Capital One swag.
- **API:** https://nessieisreal.com (sign in with GitHub for a key). The full OpenAPI spec is saved next to this note as [[ch13-nessie-openapi-spec.yaml]], an exact copy of https://nessieisreal.com/nessie-openapi-spec.yaml (73,934 bytes, SHA-256 `2a33e85ec72e34b9f4298489a06b10fce492e3f729a96aebc80de05033603dcc`).

## Judging (Hacker Guide row, verbatim)

> Completeness, Creativity, Complexity

## Devpost prize (verbatim)

- [Capital One] Best Use of Nessie, $1,200 in cash, 1 winner: "$300 Giftogram per person on winning team"

## From Pre-Event Details #2 (Oct 15)

> *Capital One –* More than 25 years ago, Capital One revolutionized the credit card industry with data and technology. Today, we are one of the most widely recognized brands in banking — serving more than 100 million customers across a diverse set of businesses.
>
> Our track is The Best Use of Nessie! This is your chance to change the game in fintech. Whether it's an innovative payment solution, helping consumers shop smarter, making financing more accessible, or a creative way to improve financial literacy, we want to see your boldest ideas in action. The track is intentionally vague to let you bring your own creativity to it!
> You can optionally take advantage of Capital One's Hackathon API, Nessie (nessieisreal.com). It provides mock banking/transaction data to help spearhead your idea.

## Slack #spons-capital-one (Oct 23, verbatim apart from the greeting and the QR image)

**arko (Capital One), 5:44 PM:**

> Hey all, as you heard in the opening ceremony our sponsor challenge for this hackathon is the "Best use of the Nessie API"
> You can see the API and it's details at https://nessieisreal.com/

**Peter Luo (Capital One), 6:05 PM:**

> Come join us for a Super Smash Bros Ultimate tournament sponsored by Capital One tomorrow at 12 pm, Oct 24, 2026! This tournament is open to ALL hackers of ALL skill levels: we will randomly select 32 lucky participants for the events. Winners of the tournament (and maybe some lucky audience members) will receive exclusive Capital One swag. So don't miss out on the event of the season, and may the best hacker win!
> Sign-up link: https://forms.gle/d2pMuDu4WUkjSfe27

## What Cindia v2 does for this track

The brief's line: "Every sale, payout and maker payment against a Nessie bank account."

- **The account:** a real Nessie customer, "Gu Embroidery Studio" (with a fictional US mailing address), and its Checking account, nicknamed "Gu studio operating".
- **The month so far:** September's bank records from the mock data are seeded once, except the buyer's sale and the maker payouts, which the demo posts live. Seeding does nothing once the account has deposits.
- **The sale, live:** the buyer's sale posts as a deposit. For the $180 peony fan that's $156.48 (15648 cents), the price after the Cindia fee and the card fee.
- **Maker payments, live:** the three maker payouts go out as withdrawals once the owner approves them.
- **The balance:** the money map's balance comes back from Nessie, computed from the deposit and withdrawal lists, because the account's own `balance` may not follow deposits.
- **Why deposits and withdrawals:** Nessie can't create purchases or transfers. A create call answers with a plain string, so the server reads the list back to find the new record.
- **In the repo:** upgrade B04 (`docs/plans/B04-bank.md`), from v1 and kept in v2. The key is `NESSIE_KEY`, sent as `?key=` on every request.

---

## Nessie API

Copied from nessieisreal.com on Oct 21, 2026.

### Home page (verbatim)

> YOU ARE THE BANK.
>
> How will you reimagine banking?
>
> Mock banking data, real API patterns. Set up transactions, manage accounts, and build something amazing.
>
> **Hackathon APIs Overview:** Access ATM and branch locations, mock customer accounts, and peer-to-peer transactions. It's structured to resemble how we actually run things at Capital One — so what you build here maps to the real world.
>
> **What is Nessie?** Nessie is the REST API behind it all. Simple HTTP requests give you full access — create customers, move money, check balances. Everything you need to prototype a banking app in a weekend.

### Getting started (verbatim, nessieisreal.com/getting-started)

> Get up and running with the Nessie API in minutes. Sign up for GitHub if you don't have an account yet.

1. **Log in with GitHub.** Click the Login button in the navigation bar to authenticate with your GitHub account. This will give you access to your own API key and customer sandbox.
2. **Retrieve your API key.** Navigate to your profile to get your API key. You'll need your API key to make requests. Add it to each request as a query parameter: `api.nessieisreal.com/customers?key=YOUR_KEY`. You can also use your key with the box at the top of the interactive documentation page.
3. **Understand API permissions.**
   - *Enterprise Endpoints:* When making requests to enterprise endpoints, you act as an analyst at Capital One. You can perform GET requests to read all data in the system, but you cannot add, modify, or delete any data. All enterprise URLs start with api.nessieisreal.com/enterprise.
   - *Customer Endpoints:* When making requests to customer endpoints, you act as a customer of Capital One. You can perform requests that involve data you own. Go to your profile to see a table of the customers you have access to. Any request URLs that do not include /enterprise are customer endpoints.
4. **Read the documentation.** All API endpoints can be found on our interactive documentation page. Click on any endpoint to learn how to use it. To test an endpoint, fill out the path and query parameters as needed and click Try it Out.
   - *Response Class:* This section describes the JSON response you can expect from the HTTP request. Click Schema to see the format of the JSON string, or click Model to see a description of each field.
   - *Parameters:* This section lists the required and optional input parameters for the HTTP request. If an input JSON string is required, you'll see the Model and Schema specifications, just like the Response Class. Click the displayed Schema to copy it into the text box.
5. **Try it with Postman.** Postman is a popular Chrome extension for making direct HTTP requests. It lets you bookmark requests and browse your request history to simplify testing and debugging. Make sure to include the appropriate headers, and don't forget your API key.

### Authentication (docs page, verbatim)

1. Log in with your GitHub account using the Login button in the navigation bar.
2. Copy your API key from the panel above. This key is unique to your account.
3. Authorize the interactive docs by pasting your API key.
4. Or pass the key manually as a key query parameter on every request: `GET /customers?key=YOUR_API_KEY`

### Servers (from the spec)

- http://localhost:8080 (Local server)
- https://qa-api.nessieisreal.com (QA server)
- https://prod-api.nessieisreal.com (Production server)
- https://sopko4r0aj.execute-api.us-east-1.amazonaws.com/qa (Direct QA server)

Getting Started and the GitHub org page use api.nessieisreal.com instead.

### Facts worth knowing (from the spec)

- Every endpoint takes the API key as the `key` query parameter (security scheme `ApiKeyAuth`, in the query string).
- Purchases and transfers only have get, update and delete by ID (`/purchase/{purchase_id}`, `/transfers/{transfer_id}`). The spec has no endpoint that creates them.
- Withdrawals can be created with `POST /accounts/{id}/withdrawals`, but the spec types the body as a plain object ("Withdrawal creation data"). The docs page lists withdrawal fields as medium, transaction_date, status, amount and description.
- Amounts on accounts, deposits, purchases, transfers, withdrawals and loans are integers. Bill `payment_amount` is a float.
- Per the spec, create calls answer with a plain string such as "Deposit created" rather than the new object.
- `AccountType` is one of Credit Card, Savings, Checking. `BillStatus` is one of pending, cancelled, completed, recurring.

### Endpoints (from the spec)

Every call also takes `?key=`. Path parameters are in braces.

| Method | Path | What it does | Request body | Success |
|---|---|---|---|---|
| GET | `/customers` | Get all customers | - | 200 Customer[] |
| POST | `/customers` | Create a new customer | CustomerCreate | 201 string "Customer created" |
| GET | `/customers/{id}` | Get customer by ID | - | 200 Customer |
| PUT | `/customers/{id}` | Update customer | CustomerUpdate | 202 string "Accepted customer update" |
| GET | `/customers/{id}/accounts` | Get accounts for customer | - | 200 Account[] |
| POST | `/customers/{id}/accounts` | Create account for customer | AccountCreate | 201 string "Account created" |
| GET | `/customers/{id}/bills` | Get bills for customer | - | 200 Bill[] |
| GET | `/accounts` | Get all accounts | - | 200 Account[] |
| GET | `/accounts/{id}` | Get account by ID | - | 200 Account |
| PUT | `/accounts/{id}` | Update account | AccountUpdate | 202 string "Accepted account update" |
| DELETE | `/accounts/{id}` | Delete account | - | 200 (empty) |
| GET | `/accounts/{id}/customer` | Get customer for account | - | 200 string "Customer on account!" |
| GET | `/accounts/{id}/bills` | Get bills for account | - | 200 Bill[] |
| POST | `/accounts/{id}/bills` | Create bill for account | BillCreate | 201 string "Bill created" |
| GET | `/accounts/{id}/deposits` | Get deposits for account | - | 200 Deposit[] |
| POST | `/accounts/{id}/deposits` | Create deposit for account | DepositCreate | 201 string "Deposit created" |
| GET | `/accounts/{id}/loans` | Get loans for account | - | 200 Loan[] |
| POST | `/accounts/{id}/loans` | Create loan for account | LoanCreate | 201 string "Loan created" |
| GET | `/bills/{billId}` | Get bill by ID | - | 200 Bill |
| PUT | `/bills/{billId}` | Update bill | BillUpdate | 202 string "Accepted bill update" |
| DELETE | `/bills/{billId}` | Delete bill | - | 200 string "Bill deleted" |
| GET | `/deposits` | Get all deposits | - | 200 Deposit[] |
| GET | `/deposits/{id}` | Get deposit by ID | - | 200 Deposit |
| PUT | `/deposits/{id}` | Update deposit | DepositUpdate | 202 string "Accepted deposit update" |
| DELETE | `/deposits/{id}` | Delete deposit | - | 200 (empty) |
| GET | `/loans/{id}` | Get loan by ID | - | 200 Loan |
| PUT | `/loans/{id}` | Update loan | LoanUpdate | 202 string "Accepted loan update" |
| DELETE | `/loans/{id}` | Delete loan | - | 200 (empty) |
| GET | `/merchants` | Get all merchants | - | 200 Merchant[] |
| POST | `/merchants` | Create a new merchant | MerchantCreate | 201 string "Merchant created" |
| GET | `/merchants/{id}` | Get merchant by ID | - | 200 Merchant |
| PUT | `/merchants/{id}` | Update merchant | MerchantUpdate | 202 string "Accepted merchant update" |
| GET | `/atms` | Get all ATMs | - | 200 ATM[] |
| GET | `/atms/{id}` | Get ATM by ID | - | 200 ATM |
| GET | `/branches` | Get all branches | - | 200 Branch[] |
| GET | `/branches/{id}` | Get branch by ID | - | 200 Branch |
| GET | `/enterprise/customers` | Get all customers (Enterprise) | - | 200 Customer[] |
| GET | `/enterprise/customers/{customer_id}` | Get customer by ID (Enterprise) | - | 200 Customer |
| GET | `/enterprise/deposits` | Get all deposits (Enterprise) | - | 200 Deposit[] |
| GET | `/enterprise/deposits/{deposit_id}` | Get deposit by ID (Enterprise) | - | 200 Deposit |
| GET | `/enterprise/withdrawal/{withdrawal_id}` | Get withdrawal by ID (Enterprise) | - | 200 object |
| GET | `/purchase/{purchase_id}` | Get purchase by ID | - | 200 object |
| PUT | `/purchase/{purchase_id}` | Update purchase | object (Purchase update data) | 202 string "Accepted purchase update" |
| DELETE | `/purchase/{purchase_id}` | Delete purchase | - | 200 (empty) |
| GET | `/transfers/{transfer_id}` | Get transfer by ID | - | 200 object |
| PUT | `/transfers/{transfer_id}` | Update transfer | object (Transfer update data) | 202 string "Accepted transfer update" |
| DELETE | `/transfers/{transfer_id}` | Delete transfer | - | 200 (empty) |
| GET | `/withdrawal/{withdrawal_id}` | Get withdrawal by ID | - | 200 object |
| PUT | `/withdrawal/{withdrawal_id}` | Update withdrawal | object (Withdrawal update data) | 202 string "Accepted withdrawal update" |
| DELETE | `/withdrawal/{withdrawal_id}` | Delete withdrawal | - | 200 (empty) |
| GET | `/accounts/{id}/withdrawals` | Get withdrawals for account | - | 200 array |
| POST | `/accounts/{id}/withdrawals` | Create withdrawal for account | object (Withdrawal creation data) | 201 string "Withdrawal created" |

### Schemas (from the spec)

- **Error**
  - `code` integer: Error code
  - `message` string: Error message
  - `details` string: Additional error details
- **Address**
  - `street_number` string (required): Street number
  - `street_name` string (required): Street name
  - `city` string (required): City
  - `state` string (required): State
  - `zip` string (required): ZIP code
- **Geocode**
  - `lat` number (float) (required): Latitude
  - `lng` number (float) (required): Longitude
- **Customer**
  - `_id` string (required): Customer unique identifier
  - `first_name` string (required): Customer's first name
  - `last_name` string (required): Customer's last name
  - `address` Address (required)
- **CustomerCreate**
  - `first_name` string (required): Customer's first name
  - `last_name` string (required): Customer's last name
  - `address` Address (required)
- **CustomerUpdate**
  - `first_name` string: Customer's first name
  - `last_name` string: Customer's last name
  - `address` Address
- **AccountType**: Type of account · one of Credit Card, Savings, Checking
- **Account**
  - `_id` string (required): Account unique identifier
  - `type` AccountType (required)
  - `nickname` string (required): Nickname associated with account
  - `rewards` integer (required): Reward points associated with account
  - `balance` integer (required): Balance associated with account
  - `account_number` string (required): 16 digit Account Number that is associated with the account
  - `customer_id` string (required): ID of customer who owns the account
- **AccountCreate**
  - `type` AccountType (required)
  - `nickname` string (required): Nickname associated with account
  - `rewards` integer (required): Reward points associated with account
  - `balance` integer (required): Balance associated with account
- **AccountUpdate**
  - `nickname` string (required): Nickname associated with account
- **BillStatus**: Status of the bill · one of pending, cancelled, completed, recurring
- **Bill**
  - `_id` string (required): Bill unique identifier
  - `status` BillStatus (required)
  - `payee` string (required): The entity the bill will be paid to
  - `nickname` string (required): A nickname for the bill to help you identify it
  - `creation_date` string (date) (required): When the bill was created
  - `payment_date` string (required): Date when bill is going to be paid or was paid
  - `recurring_date` integer (required): Day of month bill will recur
  - `upcoming_payment_date` string (required): Next bill payment date
  - `payment_amount` number (float) (required): Bill amount
  - `account_id` string (required): ID of account that this bill is associated with
- **BillCreate**
  - `status` BillStatus (required)
  - `payee` string (required): The entity the bill will be paid to
  - `nickname` string: A nickname for the bill to help you identify it
  - `payment_date` string: Date when bill is going to be paid or was paid
  - `recurring_date` integer: Day of month bill will recur
  - `payment_amount` number (float) (required): Bill amount
- **BillUpdate**
  - `status` BillStatus
  - `payee` string: The entity the bill will be paid to
  - `nickname` string: A nickname for the bill to help you identify it
  - `payment_date` string: Date when bill is going to be paid or was paid
  - `recurring_date` integer: Day of month bill will recur
  - `payment_amount` number (float): Bill amount
- **Merchant**
  - `_id` string (required): Merchant unique identifier
  - `name` string (required): Name associated with the merchant
  - `category` string: Category associated with the merchant
  - `address` Address
  - `geocode` Geocode
- **MerchantCreate**
  - `name` string (required): Name associated with the merchant
  - `category` string: Category associated with the merchant
  - `address` Address
  - `geocode` Geocode
- **MerchantUpdate**
  - `name` string: Name associated with the merchant
  - `category` string: Category associated with the merchant
  - `address` Address
  - `geocode` Geocode
- **Branch**
  - `_id` string (required): Branch unique identifier
  - `name` string (required): Unique nickname associated with branch
  - `phone_number` string (required): Phone number of the branch
  - `hours` array of string (required): Hours of Operation of branch
  - `notes` array of string (required): Special notes about branch
  - `address` Address (required)
- **Deposit**
  - `_id` string (required): Deposit unique identifier
  - `medium` string (required): Medium of the deposit
  - `transaction_date` string (required): Date the deposit was made
  - `status` string (required): Status of the deposit
  - `amount` integer (required): Amount of the deposit
  - `description` string (required): Description about the deposit
- **DepositCreate**
  - `medium` string (required): Medium of the deposit
  - `transaction_date` string (required): Date the deposit was made
  - `status` string (required): Status of the deposit
  - `amount` integer (required): Amount of the deposit
  - `description` string (required): Description about the deposit
- **DepositUpdate**
  - `medium` string: Medium of the deposit
  - `transaction_date` string: Date the deposit was made
  - `status` string: Status of the deposit
  - `amount` integer: Amount of the deposit
  - `description` string: Description about the deposit
- **Loan**
  - `_id` string (required): Loan unique identifier
  - `type` string (required): Type of the loan
  - `creation_date` string (date) (required): Date the loan was created on
  - `status` string (required): Status of the loan
  - `credit_score` integer (required): Credit score of the borrower of the loan
  - `monthly_payment` integer (required): Monthly payment amount for the loan
  - `amount` integer (required): Amount of the loan
  - `description` string (required): Description about the loan
- **LoanCreate**
  - `type` string (required): Type of the loan
  - `status` string (required): Status of the loan
  - `credit_score` integer (required): Credit score of the borrower of the loan
  - `monthly_payment` integer (required): Monthly payment amount for the loan
  - `amount` integer (required): Amount of the loan
  - `description` string (required): Description about the loan
- **LoanUpdate**
  - `type` string: Type of the loan
  - `status` string: Status of the loan
  - `credit_score` integer: Credit score of the borrower of the loan
  - `monthly_payment` integer: Monthly payment amount for the loan
  - `amount` integer: Amount of the loan
  - `description` string: Description about the loan

### Transaction pages (docs, verbatim)

**Purchases.** "Track purchase transactions on accounts." Fields: `_id` string (Unique identifier), `medium` string (Purchase medium), `transaction_date` string (Date of transaction), `status` string (Transaction status), `amount` integer (Purchase amount), `description` string (Description), `merchant_id` string (Associated merchant ID).

```json
{
  "_id": "5a1b0e4e4f52360490000013",
  "medium": "balance",
  "transaction_date": "2025-03-17",
  "status": "completed",
  "amount": 45,
  "description": "Grocery shopping",
  "merchant_id": "5a1b0e4e4f52360490000020"
}
```

**Transfers.** "Move money between accounts." Fields: `_id`, `medium`, `transaction_date`, `status`, `amount` (integer), `description`.

```json
{
  "_id": "5a1b0e4e4f52360490000012",
  "medium": "balance",
  "transaction_date": "2025-03-16",
  "status": "completed",
  "amount": 150,
  "description": "Transfer to savings"
}
```

**Withdrawals.** "Process withdrawals from accounts." Fields: `_id`, `medium`, `transaction_date`, `status`, `amount` (integer), `description`.

```json
{
  "_id": "5a1b0e4e4f52360490000011",
  "medium": "balance",
  "transaction_date": "2025-03-16",
  "status": "completed",
  "amount": 200,
  "description": "ATM withdrawal"
}
```

### SDKs, examples and starter code

- **SDK page** (nessieisreal.com/sdk) lists Swift, Android, Ruby and JavaScript. Swift: "An iOS library that wraps the Nessie API in Swift methods. It can be easily integrated into any iOS project." Its documentation link says Xcode >= 7.0, so these libraries are old. Check their endpoints against the spec before relying on them.
- **Examples page** (nessieisreal.com/examples) has tabs for Python, JavaScript, Go, Java and Swift, and says: "Examples are on their way. In the meantime, try our API directly from the interactive documentation or check the Getting Started guide for setup instructions."
- **GitHub:** github.com/nessieisreal (profile link http://api.nessieisreal.com), 9 public repos:
  - nessie-javascript-sdk: "JavaScript wrapper which provides functions to interact with the Nessie API."
  - nessie-python-sdk
  - nessie-golang-sdk: "Golang wrapper which provides functions to interact with the Nessie API."
  - nessie-android-sdk: "An Android specific SDK for the Nessie API."
  - nessie-ios-sdk
  - nessie-ruby-sdk: "Rubygem to connect to the Capital One API" (forked from Shwheelz/capital_one)
  - api-demo-starter: "Starter code for the API Demo app."
  - advanced-api-starter: "Starter project for the Advanced APIs Workshop."
  - DataPopulationDashboard

### Links

- Docs: https://nessieisreal.com/docs
- Getting started: https://nessieisreal.com/getting-started
- Spec: https://nessieisreal.com/nessie-openapi-spec.yaml
- GitHub: https://github.com/nessieisreal
