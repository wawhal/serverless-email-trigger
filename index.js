
const fetch = require('node-fetch');

const sparkpostKey = process.env.SPARKPOST_API_KEY
const PG_CONNECTION_STRING= process.env.POSTGRES_CONNECTION_STRING;
const pg = require('pg');
const knex = require('knex');

pg.defaults.ssl = true;


const sendMail = async (email_id) => {
  const response = await fetch(
    'https://api.sparkpost.com/api/v1/transmissions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': sparkpostKey
      },
      body: JSON.stringify({
        "content": {
            "from": "test@mailtest.hasura-app.io",
            "subject": "Email from Hasura Event Triggers",
            "text": "Email from Hasura Event trigger."
          },
        "recipients": [{ "address": email_id }]
      })
    }
  );
  const responseObj = await response.json()
  console.log(responseObj)
  return {
    error: response.status !== 200 
  }
} 

const updateDb = async (id) => {
  const knexClient = knex({
    client: 'pg',
    connection: PG_CONNECTION_STRING
  });
  return knexClient('profile')
    .where({ id })
    .update({ email_sent: true })
    .then((r) => {
      console.log(r);
      return {
        error: false
      }
    })
    .catch((e) =>  {
      console.log(e);
      return {
        error: true
      }
    })
    .finally(() => {
      knexClient.destroy();      
    });
}

exports.handler = async (event, context, callback) => {
  let request;

  try {
    console.log(event);
    request = JSON.parse(event.body);
  } catch (e) {
    return callback(null, {statusCode: 400, body: "cannot parse hasura event"});
  }
  const response = {
    statusCode: 200,
    body: "success"
  };
  const emailResponse = await sendMail(request.event.data.new.email_id)
  if (emailResponse.error) {
    response.statusCode = 500;
    response.body = "sending email failed" 
    callback(null, response);
    return;
  }
  const dbResp = await updateDb(request.event.data.new.id);
  if (dbResp.error) {
    response.statusCode = 500;
    response.body = 'updating db failed';
    callback(null, response);
    return;
  } else {
    callback(null, response);
  }
  return;
};
