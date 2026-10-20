const Article = require('../models/Article');
const ViewStat = require('../models/ViewStat');
const Visitor = require('../models/Visitor');
async function record(article, visitor) {
  const hour = new Date(); hour.setUTCMinutes(0, 0, 0);
  // Unique index and retry handle simultaneous first visits in the same hour.
  try { await ViewStat.updateOne({ article, hour }, { $inc: { count: 1 } }, { upsert: true }); }
  catch (error) {
    if (error.code !== 11000) throw error;
    await ViewStat.updateOne({ article, hour }, { $inc: { count: 1 } });
  }
  await Article.updateOne({ _id: article }, { $inc: { views: 1 } });
  await Visitor.updateOne({ _id: visitor }, { $addToSet: { seen: article }, $set: { expiresAt: new Date(Date.now() + 365 * 86400000) } }, { upsert: true });
  // Keep the most recent 10,000 article IDs for this browser.
  await Visitor.updateOne({ _id: visitor }, { $push: { seen: { $each: [], $slice: -10000 } } });
}
module.exports = { record };
