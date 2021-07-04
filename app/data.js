const { MongoClient } = require("mongodb");

const DATABASE_HOST = process.env.DATABASE_HOST;
const DATABASE_PORT = process.env.DATABASE_PORT;
const DATABASE_NAME = process.env.DATABASE_NAME;
const DATABASE_USERNAME = process.env.DATABASE_USERNAME;
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD;

const uri = `mongodb://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}`;

let db = null;

const StalkerRepository = async () => {
  if (db == null) {
    try {
      const client = new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      await client.connect();
      db = client.db(DATABASE_NAME);

      console.log("Successfully connected to database");
    } catch (error) {
      console.log("Error connected to database");
      console.log(error);
    }
  }

  const stalkers = db.collection("stalkers");
  const stalkees = db.collection("stalkees");

  const addStalkee = async (chatId, stalkeeAddress, alias) => {
    // Create stalker if not exist.
    let stalker = await stalkers.findOne({ _id: chatId });
    if (stalker == null) {
      stalker = { _id: chatId, stalkees: [] };
      await stalkers.insertOne(stalker);
    }

    // Update stalkee list.
    await stalkers.updateOne(
      { _id: chatId },
      { $addToSet: { stalkees: { address: stalkeeAddress, alias } } }
    );

    // Create stalkee if not exist.
    let stalkee = await stalkees.findOne({ _id: stalkeeAddress });
    if (stalkee == null) {
      stalkee = { _id: stalkeeAddress, alias, stalkers: [] };
      await stalkees.insertOne(stalkee);
    }

    // Update stalker list.
    await stalkees.updateOne(
      { _id: stalkeeAddress },
      { $addToSet: { stalkers: chatId } }
    );
  };

  const removeStalkee = async (chatId, stalkeeAddress) => {
    let stalker = await stalkers.findOne({ _id: chatId });
    if (stalker == null) {
      throw "Stalker not exist";
    }

    const removedStalkee = stalker.stalkees.find(
      (stalkee) => stalkee.address == stalkeeAddress
    );
    if (removedStalkee == null) {
      throw "Stalkee not exist";
    }

    await stalkers.updateOne(
      { _id: chatId },
      { $pull: { stalkees: { address: stalkeeAddress } } }
    );

    let stalkee = await stalkees.findOne({ _id: stalkeeAddress });
    if (stalkee == null) {
      throw "Stalkee not exist";
    }

    const updatedStalkers = stalkee.stalkers.filter(
      (stalker) => stalker != chatId
    );
    // Remove stalkee if it have no stalkers.
    if (updatedStalkers.length == 0) {
      await stalkees.deleteOne({ _id: stalkeeAddress });
    } else {
      await stalkees.updateOne(
        { _id: stalkeeAddress },
        { $pull: { stalkers: chatId } }
      );
    }

    return removedStalkee;
  };

  const getStalkee = async (stalkeeAddress) => {
    let stalkee = await stalkees.findOne({ _id: stalkeeAddress });
    return stalkee;
  };

  const getStalkees = async (chatId) => {
    let stalker = await stalkers.findOne({ _id: chatId });
    if (stalker == null) {
      return [];
    }
    return stalker.stalkees;
  };

  return { addStalkee, removeStalkee, getStalkees, getStalkee };
};

module.exports = StalkerRepository;
