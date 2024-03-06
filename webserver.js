//Webapp to handle the responses for the DJ lineup and the user's username.
//As per the original implementation, we look up the users country and return it.

const express = require('express')
const app = express()
const cors = require('cors')
const geoip = require('geoip-country')
const countries = require('./web_misc/country.json')
const lineup = require('./web_misc/lineup.json')

app.use(cors({
    origin: '*'
  }));

// Artist lineup to be shown in the client
app.get('/data/artists/index.json', (req, res) => {
    res.json(lineup)
})

app.get('/geo', (req, res) => {
    console.log(geoip.lookup(req.headers['x-real-ip']).country) // To run behind a proxy where "x-real-ip" contains the users actual IP. Change if you don't run this behind a proxy
    userCountry = countries[geoip.lookup(req.headers['x-real-ip']).country]
    console.log(userCountry)
    res.json({
        "success": true,
        "location": {
            "city": "The Sky",
            "country": userCountry,
        }
    })
})

// app.all('*', (req, res) => {
//     console.log(req.path)
//     console.log(req.headers)
//     console.log(req.body)
//     res.json()
// })

//Change the port if you wish
app.listen(8123, () => { // Start the webserver
    console.log(`Server running on port: 8123`)
})
