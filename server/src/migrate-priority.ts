import mongoose from "mongoose";

const run = async () => {
  const mongoUri =
    process.env.MONGODB_URI ||
    "mongodb://AceoneSupport:A!ceone-mongocluster@ac-c2bzbo0-shard-00-00.dffbzkm.mongodb.net:27017,ac-c2bzbo0-shard-00-01.dffbzkm.mongodb.net:27017,ac-c2bzbo0-shard-00-02.dffbzkm.mongodb.net:27017/?ssl=true&replicaSet=atlas-10c7ui-shard-0&authSource=admin&appName=Cluster0";

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db!;

  const collections = await db.listCollections().toArray();
  console.log("Collections:", collections.map((c) => c.name));

  const totalLeads = await db.collection("leads").countDocuments();
  console.log("Total leads:", totalLeads);

  if (totalLeads > 0) {
    const sample = await db.collection("leads").find().limit(1).toArray();
    console.log("Sample lead keys:", Object.keys(sample[0]));
    if (sample[0].priority !== undefined) {
      console.log("Sample lead priority value:", sample[0].priority, typeof sample[0].priority);
    }
  }

  const allPriorities = await db
    .collection("leads")
    .aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }])
    .toArray();
  console.log("Priority distribution:", JSON.stringify(allPriorities));

  const result = await db
    .collection("leads")
    .updateMany({ priority: "med" }, { $set: { priority: "medium" } });

  console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
