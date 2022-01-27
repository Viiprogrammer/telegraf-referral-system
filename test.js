const { MongoClient } = require('mongodb')
const Referrals = require('./src/index')
const crypto = require('crypto')
let ReferralSys, firstUserID, userWithParentID, userWithParentIDLevel2, userWithParentIDLevel3
const __MONGO_URI__ = process.env.MONGO_URL
const __MONGO_DB_NAME__ = process.env.MONGO_DB_NAME

function genUserId () {
  return crypto.randomBytes(12)
    .toString('hex')
}

describe('Referral system', () => {
  let connection
  let db

  beforeAll(async () => {
    connection = await MongoClient.connect(__MONGO_URI__, {
      useNewUrlParser: true
    })
    db = await connection.db(__MONGO_DB_NAME__)

    ReferralSys = new Referrals({ db })
    await ReferralSys._collection.deleteMany({})
  })

  afterAll(async () => {
    await connection.close()
    await db.close()
  })

  it('Create referral without parent', async () => {
    firstUserID = genUserId()
    const mockUser = { _id: firstUserID, payload: 'payloadfirstuser' }
    const insertedUser = await ReferralSys.createReferral(firstUserID, 'payloadfirstuser')
    expect(insertedUser.insertedId).toBe(mockUser._id)
  })

  it('Create referral with parent', async () => {
    userWithParentID = genUserId()

    const mockUser = { _id: userWithParentID, payload: 'payloadwithparentuser' }
    const insertedUser = await ReferralSys.createReferral(userWithParentID, 'payloadwithparentuser', firstUserID)

    const { _id: parentId } = await ReferralSys._collection.findOne({ 'childrens.1': { $elemMatch: { _id: userWithParentID } } })

    expect(parentId).toBe(firstUserID)
    expect(insertedUser._id).toBe(mockUser._id)
    expect(insertedUser.payload).toBe(mockUser.payload)
  })

  it('Create referral with parent (referral level 2)', async () => {
    userWithParentIDLevel2 = genUserId()

    const mockUser = { _id: userWithParentIDLevel2, payload: 'payloadwithparentuserlvl2' }
    const insertedUser = await ReferralSys.createReferral(userWithParentIDLevel2, 'payloadwithparentuserlvl2', userWithParentID)

    const { _id: parentId, childrens: childrens1Level } = await ReferralSys._collection.findOne({ 'childrens.1': { $elemMatch: { _id: userWithParentIDLevel2 } } })
    const { _id: parentIdLevel2, childrens: childrens2Level } = await ReferralSys._collection.findOne({ 'childrens.2': { $elemMatch: { _id: userWithParentIDLevel2 } } })

    const childFrom1LevelParent = childrens1Level[1].find(({ _id }) => _id === mockUser._id)
    const childFrom2LevelParent = childrens2Level[2].find(({ _id }) => _id === mockUser._id)

    expect(parentId).toBe(userWithParentID)
    expect(childFrom1LevelParent.payload).toBe(mockUser.payload)
    expect(parentIdLevel2).toBe(firstUserID)
    expect(childFrom2LevelParent.payload).toBe(mockUser.payload)
    expect(insertedUser._id).toBe(mockUser._id)
    expect(insertedUser.payload).toBe(mockUser.payload)
  })

  it('Create referral with parent (referral level 3)', async () => {
    userWithParentIDLevel3 = genUserId()

    const mockUser = { _id: userWithParentIDLevel3, payload: 'payloadwithparentuserlvl3' }
    const insertedUser = await ReferralSys.createReferral(userWithParentIDLevel3, 'payloadwithparentuserlvl3', userWithParentIDLevel2)

    const { _id: parentId, childrens: childrens1Level } = await ReferralSys._collection.findOne({ 'childrens.1': { $elemMatch: { _id: userWithParentIDLevel3 } } })
    const { _id: parentIdLevel2, childrens: childrens2Level } = await ReferralSys._collection.findOne({ 'childrens.2': { $elemMatch: { _id: userWithParentIDLevel3 } } })
    const { _id: parentIdLevel3, childrens: childrens3Level } = await ReferralSys._collection.findOne({ 'childrens.3': { $elemMatch: { _id: userWithParentIDLevel3 } } })

    const childFrom1LevelParent = childrens1Level[1].find(({ _id }) => _id === mockUser._id)
    const childFrom2LevelParent = childrens2Level[2].find(({ _id }) => _id === mockUser._id)
    const childFrom3LevelParent = childrens3Level[3].find(({ _id }) => _id === mockUser._id)

    expect(parentId).toBe(userWithParentIDLevel2)
    expect(childFrom1LevelParent.payload).toBe(mockUser.payload)
    expect(parentIdLevel2).toBe(userWithParentID)
    expect(childFrom2LevelParent.payload).toBe(mockUser.payload)
    expect(parentIdLevel3).toBe(firstUserID)
    expect(childFrom3LevelParent.payload).toBe(mockUser.payload)
    expect(insertedUser._id).toBe(mockUser._id)
  })

  it('Get referrals', async () => {
    const { parents, childrens } = await ReferralSys.getReferrals(firstUserID)

    expect(parents).toBeUndefined()

    expect(Object.keys(childrens)).toHaveLength(3)
    expect(childrens).toHaveProperty('1')
    expect(childrens).toHaveProperty('2')
    expect(childrens).toHaveProperty('3')

    expect(childrens[1][0]._id).toBe(userWithParentID)
    expect(childrens[2][0]._id).toBe(userWithParentIDLevel2)
    expect(childrens[3][0]._id).toBe(userWithParentIDLevel3)

    expect(childrens[1][0].payload).toBe('payloadwithparentuser')
    expect(childrens[2][0].payload).toBe('payloadwithparentuserlvl2')
    expect(childrens[3][0].payload).toBe('payloadwithparentuserlvl3')
  })

  it('Update referral payload', async () => {
    const [
      { value: updatedReferral }
    ] = await ReferralSys.updateReferralPayload(userWithParentIDLevel3, 'newpayload')

    const { _id: parentId } = await ReferralSys._collection.findOne({ 'childrens.1': { $elemMatch: { _id: userWithParentIDLevel3, payload: 'newpayload' } } })
    const { _id: parentIdLevel2 } = await ReferralSys._collection.findOne({ 'childrens.2': { $elemMatch: { _id: userWithParentIDLevel3, payload: 'newpayload' } } })
    const { _id: parentIdLevel3 } = await ReferralSys._collection.findOne({ 'childrens.3': { $elemMatch: { _id: userWithParentIDLevel3, payload: 'newpayload' } } })

    expect(parentId).toBe(userWithParentIDLevel2)
    expect(parentIdLevel2).toBe(userWithParentID)
    expect(parentIdLevel3).toBe(firstUserID)
    expect(updatedReferral.payload).toBe('newpayload')
  })

  it('Remove referral', async () => {
    await ReferralSys.removeReferral(userWithParentIDLevel3)

    const parent = await ReferralSys._collection.findOne({ 'childrens.1': { $elemMatch: { _id: userWithParentIDLevel3 } } })
    const parentLevel2 = await ReferralSys._collection.findOne({ 'childrens.2': { $elemMatch: { _id: userWithParentIDLevel3 } } })
    const parentLevel3 = await ReferralSys._collection.findOne({ 'childrens.3': { $elemMatch: { _id: userWithParentIDLevel3 } } })
    const referral = await ReferralSys._collection.findOne({ _id: userWithParentIDLevel3 })

    expect(parent).toBeNull()
    expect(parentLevel2).toBeNull()
    expect(parentLevel3).toBeNull()
    expect(referral).toBeNull()
  })
})
