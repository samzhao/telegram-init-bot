'use strict'

const getCurrentWeather = require('./lib/getCurrentWeather')

exports.handle = function handle(client) {
  const handleGreeting = client.createStep({
    satisfied() {
      return false
    },

    prompt() {
      client.addResponse('greeting')
      client.done()
    }
  })

  const handleGoodbye = client.createStep({
    satisfied() {
      return false
    },

    prompt() {
      client.addResponse('goodbye')
      client.done()
    }
  })

  const sayHello = client.createStep({
    satisfied() {
      return Boolean(client.getConversationState().helloSent)
    },

    prompt() {
      client.addResponse('greeting')
      client.updateConversationState({
        helloSent: true
      })
      client.done()
    }
  })

  const untrained = client.createStep({
    satisfied() {
      return false
    },

    prompt() {
      client.addResponse('apology/untrained')
      client.done()
    }
  })

  const collectCity = client.createStep({
    satisfied() {
      return Boolean(client.getConversationState().weatherCity)
    },

    extractInfo() {
     const city = client.getFirstEntityWithRole(client.getMessagePart(), 'city')
      if (city) {
        client.updateConversationState({
          weatherCity: city,
        })
        console.log('User wants the weather in:', city.value)
      }
    },

    prompt() {
      client.addResponse('prompt/weather_city')
      client.done()
    },
  })

  const provideWeather = client.createStep({
    satisfied() {
      return false
    },

    prompt(callback) {
      const environment = client.getCurrentApplicationEnvironment()
      getCurrentWeather(environment.weatherAPIKey, client.getConversationState().weatherCity.value, resultBody => {
        if (!resultBody || resultBody.cod !== 200) {
          console.log('Error getting weather.')
          callback()
          return
        }

        const weatherDescription = (
          resultBody.weather.length > 0 ?
          resultBody.weather[0].description :
          null
        )

        const weatherData = {
          temperature: Math.round(resultBody.main.temp),
          condition: weatherDescription,
          city: resultBody.name,
        }

        console.log('sending real weather:', weatherData)
        client.addResponse('provide_weather/current', weatherData)
        client.done()

        callback()
      })
    },
  })

  client.runFlow({
    classifications: {
      goodbye: 'goodbye',
      greeting: 'greeting',
    },
    streams: {
      goodbye: handleGoodbye,
      greeting: handleGreeting,
      main: 'onboarding',
      onboarding: [sayHello],
      end: [untrained]
    }
  })

  // client.runFlow({
  //   classifications: {},
  //   streams: {
  //     main: 'hi',
  //     hi: [sayHello],
  //     getWeather: [collectCity, provideWeather]
  //   }
  // })
}
