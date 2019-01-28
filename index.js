require('dotenv').config();

const { promisify } = require('util');
const axios = require('axios');
const schedule = require('node-schedule');
const redis = require('redis');
const moment = require('moment');
const momentFrCh = require('moment/locale/fr-ch');

moment.updateLocale('fr-ch', momentFrCh);

// Connect and prepare Redis Database
const db = redis.createClient(process.env.REDIS_URL);
const getAsync = promisify(db.get).bind(db);

/**
 * Based on the database state, send Slack message
 *
 * @param {setNew} Boolean set if last_speaker must be updated
 * @param {message} String message content with NEW_SPEAKER and NEXT_SPEAKER placeholders
 */
const reminder = async ({ setNew = false, message }) => {
  const isActive = await getAsync('is_active');

  if (JSON.parse(isActive)) {
    const speakersData = await getAsync('speakers');
    const speakers = speakersData.split(' ');
    const lastSpeaker = await getAsync('last_speaker');

    // Define the new speaker
    const newSpeakerId = lastSpeaker ? speakers.indexOf(lastSpeaker) + 1 : 0;
    let newSpeaker = speakers[newSpeakerId];
    if (newSpeakerId + 1 > speakers.length) newSpeaker = speakers[0];

    // Define the speaker who come after the new speaker
    let nextSpeaker = speakers[newSpeakerId + 1];
    if (newSpeakerId + 2 > speakers.length) nextSpeaker = speakers[0];
    if (newSpeakerId + 1 > speakers.length) nextSpeaker = speakers[1];

    // Update last_speaker
    if (setNew) db.set('last_speaker', newSpeaker, redis.print);

    // Post Slack message
    axios({
      method: 'post',
      url: `https://hooks.slack.com/services/${process.env.SLACK_AUTH_TOKEN}`,
      data: {
        text: message
          .replace('NEW_SPEAKER', newSpeaker)
          .replace('NEXT_SPEAKER', nextSpeaker),
        channel: '#dev',
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

// Monday reminder the wednesday presentation
const mondayReminder = new schedule.RecurrenceRule();
mondayReminder.dayOfWeek = 1; // Monday
mondayReminder.hour = 10; // At 9am
mondayReminder.minute = 40; // At 9am
// mondayReminder.second = 10; // tests purpose

schedule.scheduleJob(mondayReminder, () =>
  reminder({
    setNew: true,
    message: `
      <!here|here> :warning: mercredi *${moment()
        .add({ days: 2 })
        .format(
          'LL',
        )}*, c'est à *NEW_SPEAKER* de nous présenter quelque chose :male-teacher:

              :calendar: La semaine prochaine, ce sera au tour de NEXT_SPEAKER !
      `,
  }),
);
