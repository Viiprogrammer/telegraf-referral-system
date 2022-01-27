class Referrals {
  constructor ({ db, collectionName = 'referrals', referralLevels = 3 }) {
    this._db = db
    this.referalLevels = referralLevels
    this._collection = this._db.collection(collectionName)
  }

  _updateReferal (filter, update, options) {
    return this._collection
      .findOneAndUpdate(filter, update, options)
  }

  _createReferral (doc) {
    return this._collection.insertOne(doc)
  }

  async createReferral (_id, payload, parent) {
    if (parent) {
      // Update parent childrens, push new referral to first level
      const { value: user } = await this._updateReferal(
        { _id: parent },
        {
          $push: {
            'childrens.1': {
              _id, payload
            }
          }
        },
        { new: true }
      )

      const childrenParents = { 1: parent }
      // Push into parents of child, other parents of his parent
      if (user.parents) {
        for (let parentLevel = 1; parentLevel < this.referalLevels; parentLevel++) {
          if (user.parents[parentLevel]) {
            childrenParents[parentLevel + 1] = user.parents[parentLevel]
          }
        }
      }

      const referalDoc = {
        _id, payload, parents: childrenParents
      }

      await this._createReferral(referalDoc)
      let parentsForUpdate = []
      // Adding to child list of parens (exclusive first level) current child
      if (childrenParents) {
        for (let parentLevel = 2; parentLevel <= this.referalLevels; parentLevel++) {
          const parentId = childrenParents[parentLevel]
          if (parentId && parentId.length) {
            parentsForUpdate.push([{ _id: parentId },
              {
                $push: {
                  [`childrens.${parentLevel}`]: { _id, payload }
                }
              }])
          }
        }
        parentsForUpdate = parentsForUpdate.map((parent) => this._updateReferal(...parent))
        await Promise.all(parentsForUpdate)
      }
      return referalDoc
    } else {
      return this._createReferral({
        _id,
        payload
      }, {})
    }
  }

  async updateReferralPayload (_id, payload) {
    const referral = await this._collection
      .findOne({ _id }, {
        projection: { parents: 1 }
      })

    const update = []
    for (const parent in referral.parents) {
      update.push(
        [
          { _id: referral.parents[parent], [`childrens.${parent}`]: { $elemMatch: { _id } } },
          { $set: { [`childrens.${parent}.$.payload`]: payload } }
        ]
      )
    }

    return await Promise.all([
      this._collection.findOneAndUpdate(
        { _id },
        { $set: { payload } },
        { returnDocument: 'after' }
      ), ...update.map((parent) => this._collection.findOneAndUpdate(...parent))
    ])
  }

  async removeReferral (_id) {
    const referral = await this._collection
      .findOne({ _id }, {
        projection: { parents: 1 }
      })

    const update = []
    for (const parent in referral.parents) {
      update.push(
        [
          { _id: referral.parents[parent], [`childrens.${parent}`]: { $elemMatch: { _id } } },
          { $unset: { [`childrens.${parent}`]: '' } }
        ]
      )
    }

    return await Promise.all([
      this._collection.findOneAndDelete(
        { _id }
      ), ...update.map((parent) => this._collection.findOneAndUpdate(...parent))
    ])
  }

  getReferrals (_id, options) {
    return this._collection
      .findOne(
        { _id },
        {
          projection: {
            __v: 0,
            _id: 0
          },
          ...options
        }
      )
  }
}

module.exports = Referrals
