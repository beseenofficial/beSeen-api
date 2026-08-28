import Message from '../models/Message';

const addPublicProfileMessageStats = async () => {
  await Message.collection.createIndex({ recipient: 1 }, { name: 'messages_recipient_count' });

  return { ensuredIndexes: 1 };
};

export default addPublicProfileMessageStats;
