# Telegraf-referral-system
Module for creating a referral system for a bot with Telegraf.js

## Installation
> **[Node.js](https://nodejs.org/) 12.0.0 or newer is required**  

### Yarn
```
yarn add telegraf-referral-system
```

### NPM
```
npm i telegraf-referral-system
```

> **WARNING!!! Highly recommended use this module with transactions!!!**
> MongoDB supports transactions starting from version 4 and requires a set of replicas to use transactions, a single server is not suitable. You can use MongoDB atlas

## Usage example (for user registration):

```js
const ReferralsLib = require('telegraf-referral-system')
//..connection to db and etc...
const Referrals = new ReferralsLib({
  collectionName: 'referrals', //By default "referrals" (optional)
  referralLevels: 3, //By default 3 (optional),
  db: dbClient // Connected MongoClient object
});

const session = client.startSession();
const transactionResults = await session.withTransaction(async () => {
  //...some user register logic...
  
  await Referrals.createReferral(
    '2', // User id
    'payload', //Payload or undefined (optional) 
    '1', //Parent ID, for create withot parent - undefined (optional)
    { session } //MongoDB options
  )
});
```

## Usage with MongooseJS:

For getting MongoClient form  mongoose, you can do like this:

```js
const mongoose = require('mongoose')
const dbClient = mongoose.connection.getClient().db()
```
