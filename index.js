require('dotenv').config();

const { promisify } = require('util');
const axios = require('axios');
const schedule = require('node-schedule');
const redis = require('redis');
const moment = require('moment');
const momentFrCh = require('moment/locale/fr-ch');

moment.updateLocale('fr-ch', momentFrCh);

const db = redis.createClient(process.env.REDIS_URL);
const getAsync = promisify(db.get).bind(db);

const reminder = async ({ setNew = false, message }) => {
  console.log('start reminder');
  const isActive = await getAsync('is_active');

  if (JSON.parse(isActive)) {
    const speakersData = await getAsync('speakers');
    const speakers = speakersData.split(' ');
    const lastSpeaker = await getAsync('last_speaker');
    const newSpeakerId = lastSpeaker ? speakers.indexOf(lastSpeaker) + 1 : 0;
    let newSpeaker = speakers[newSpeakerId];
    if (newSpeakerId + 1 > speakers.length) newSpeaker = speakers[0];

    if (setNew) db.set('last_speaker', newSpeaker, redis.print);

    axios({
      method: 'post',
      url: `https://hooks.slack.com/services/${process.env.SLACK_AUTH_TOKEN}`,
      data: {
        text: message.replace('NEW_SPEAKER', newSpeaker),
        channel: '#dev-coffee-scheduler',
      },
    })
      .then(res => {
        console.log(`New reminder sent on ${moment().format()}`);
      })
      .catch(err => {
        console.error(err);
      });
  }
};

const mondayReminder = new schedule.RecurrenceRule();
mondayReminder.second = 10;

schedule.scheduleJob(mondayReminder, () =>
  reminder({
    setNew: true,
    message: `<!here|here> le ${moment()
      .add({ days: 2 })
      .format(
        'LL',
      )}, c'est au tour de *NEW_SPEAKER* de nous présenter quelque chose :male-teacher:`,
  }),
);
