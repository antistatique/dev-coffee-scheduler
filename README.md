# Dev Coffee Reminder
> Small NodeJS script to handle recurring reminders for dev coffee presentation

## Install 

You must have installed :
- Nodejs
- Yarn
- Redis

Then :

```bash
$ cd path/to/project
$ yarn
$ touch .env && vim .env
$ nodemon index.js
```

## Deploy to Heroku

Piece of cake, just push the branch to Github

## Toggle Pause

For that, you must connect to the remote Redis database and change the `is_active` value :

```bash
$ redis-cli -h HOST -p PORT -a PASSWORD
HOST:PORT> SET is_active false
HOST:PORT> exit
```

## Change speakers order

Same as for pausing the scheduler, connect and change `speaker` value :

```bash
$ redis-cli -h HOST -p PORT -a PASSWORD
HOST:PORT> SET speakers "John Tyrion Odor"
HOST:PORT> exit
```