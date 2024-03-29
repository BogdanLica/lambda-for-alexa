
const Alexa = require("ask-sdk");
const https = require("https");

const states = {
    START: `_START`,
    CITY: `_City`,
    COUNTRY: `_Country`,
    SPECIAL: `_Special`
};



const fs = require('fs');

let rawdata_countries = fs.readFileSync('countries_questions.json');
let countries = JSON.parse(rawdata_countries);


let rawdata_cities = fs.readFileSync('cities_questions.json');
let cities = JSON.parse(rawdata_cities);


function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}


function getRandomCountry() {
    return getRandomInt(countries.length)
}


function getRandomCity(country) {
    return getRandomInt(get_number_of_cities_in_a_country(country))
}




function found_country(country_name)
{
    for(var i=0;i<cities.length;i++)
    {
        if (cities[i]['country'].toLowerCase() == country_name.toLowerCase())
        {
            return i;
        }
    }
    return null;
}







function get_questions_city(country, city) {
    return cities[country]['options'][city]['questions']
}


function get_questions_country(country) {
    return countries[country]['questions']

}


function get_country_name(country) {
    return countries[country]['country']
}


function get_city_name(country, city) {
    return cities[country]['options'][city]['city']
}

function get_country_for_a_city(country) {
    return cities[country]['country']
}

function get_number_of_cities_in_a_country(country) {
    return cities[country]['options'].length
}









const invocationName = "around the globe";

// Session Attributes 
//   Alexa will track attributes for you, by default only during the lifespan of your session.
//   The history[] array will track previous request(s), used for contextual Help/Yes/No handling.
//   Set up DynamoDB persistence to have the skill save and reload these attributes between skill sessions.

function getMemoryAttributes() {
    const memoryAttributes = {
        "history": [],

        // The remaining attributes will be useful after DynamoDB persistence is configured
        "launchCount": 0,
        "lastUseTimestamp": 0,

        "lastSpeechOutput": {},
        "nextIntent": []

        // "favoriteColor":"",
        // "name":"",
        // "namePronounce":"",
        // "email":"",
        // "mobileNumber":"",
        // "city":"",
        // "state":"",
        // "postcode":"",
        // "birthday":"",
        // "bookmark":0,
        // "wishlist":[],
    };
    return memoryAttributes;
};

const maxHistorySize = 50; // remember only latest 50 intents 


// 1. Intent Handlers =============================================

const AMAZON_CancelIntent_Handler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.CancelIntent';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


        let say = 'Okay, thank you for trying the game. ';

        return responseBuilder
            .speak(say)
            .withShouldEndSession(true)
            .getResponse();
    },
};


const AMAZON_HelpIntent_Handler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        //let intents = getCustomIntents();
        //let sampleIntent = randomElement(intents);

        let say = '';

        var help_options = ['guess the city', 'guess the country', 'or special game ']

        say += ' You can play the following games :  ' + help_options + '. ';

        say += ' To start a game, just say the name of that game <break time="0.4s"/>  and for "the special game", specify a country as well.'

        say += " If you are stuck during a game, you can say something like : give up, to find out the correct answer. ";

        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_StopIntent_Handler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.StopIntent';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


        let say = 'Okay, thank you for trying the game. ';

        return responseBuilder
            .speak(say)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const AMAZON_NavigateHomeIntent_Handler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NavigateHomeIntent';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = "Say 'help' if you are stuck.  ";


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AnswerIntent_Handler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        return (attributes.state === states.CITY
            || attributes.state === states.COUNTRY
            || attributes.state === states.SPECIAL)
            && request.type === 'IntentRequest'
            && request.intent.name === 'AnswerIntent';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let slotStatus = '';
        let resolvedSlot;

        let slotValues = getSlotValues(request.intent.slots);


        let say = '';
        let hint_plural = 'hints';

        //   SLOT: Country 
        if (sessionAttributes.state == states.COUNTRY) {

            if (slotValues.Country.heardAs) {

                if (slotValues.Country.heardAs.toLowerCase() == sessionAttributes.correctAnswer.toLowerCase()) {

                    if(sessionAttributes.hints_used == 1)
                    {
                        hint_plural = 'hint'
                    }


                    slotStatus += "<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_positive_response_01'/>";
                    slotStatus += 'Congratulations! ' + slotValues.Country.heardAs + ' was the right answer . ';
                    slotStatus += 'You used ' + sessionAttributes.hints_used + ' ' + hint_plural + ' .';
                    slotStatus += ' You can try a different game now, or exit.'
                    sessionAttributes.state = states.START;
                }


            }


            if (!slotValues.Country.heardAs || sessionAttributes.state != states.START) {
                slotStatus += "<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_negative_response_01'/>";
                slotStatus += 'Sorry, that was not the correct answer. '
                if (sessionAttributes.allHints.length == 0) {
                    sessionAttributes.state = states.START
                    slotStatus += 'The correct answer was ' + sessionAttributes.correctAnswer + ' .';
                    slotStatus += ' You can choose a different game or exit.'
                }
                else {
                    if (sessionAttributes.allHints.length == 1) {
                        slotStatus += ' The last hint is : '
                    }
                    else {
                        slotStatus += 'The next hint is : '
                    }

                    var next_hint = sessionAttributes.allHints.pop();
                    sessionAttributes.hints_used++;
                    sessionAttributes.current_hint = next_hint;

                    slotStatus += next_hint

                }

            }


        }

        //   SLOT: City or SPECIAL
        if (sessionAttributes.state == states.CITY || sessionAttributes.state == states.SPECIAL) {

            if (slotValues.City.heardAs) {

                if (slotValues.City.heardAs.toLowerCase() == sessionAttributes.correctAnswer.toLowerCase()) {


                    if(sessionAttributes.hints_used == 1)
                    {
                        hint_plural = 'hint'
                    }


                    slotStatus += "<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_positive_response_01'/>";
                    slotStatus += 'Congratulations! ' + slotValues.City.heardAs + ' from ' + sessionAttributes.related + ' was the right answer . ';
                    slotStatus += 'You used ' + sessionAttributes.hints_used + ' ' + hint_plural + ' .';
                    slotStatus += ' You can try a different game now, or exit.'
                    sessionAttributes.state = states.START;
                }


            }
            // if the input is not a city or if the game is not over
            if (!slotValues.City.heardAs || sessionAttributes.state != states.START) {
                slotStatus += "<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_negative_response_01'/>";
                slotStatus += 'Sorry, that was not the correct answer. '
                if (sessionAttributes.allHints.length == 0) {
                    sessionAttributes.state = states.START
                    slotStatus += 'The correct answer was ' + sessionAttributes.correctAnswer + ' .';
                    slotStatus += ' You can choose a different game or exit.'
                }
                else {
                    if (sessionAttributes.allHints.length == 1) {
                        slotStatus += ' The last hint is : '
                    }
                    else {
                        slotStatus += 'The next hint is : '
                    }

                    var next_hint = sessionAttributes.allHints.pop();
                    sessionAttributes.hints_used++;
                    sessionAttributes.current_hint = next_hint;

                    slotStatus += next_hint

                }

            }

        }




        say += slotStatus;

        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};



const GuessTheCityIntent_Handler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'GuessTheCityIntent';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();



        var country = getRandomCountry();



        var city = getRandomCity(country);

        let say = 'The hint is : ';
        var hints_json = get_questions_city(country, city);

        sessionAttributes.current_hint = '';
        var question = hints_json.pop();
        sessionAttributes.allHints = hints_json;

        sessionAttributes.state = states.CITY;

        // put an attribute with all the questions
        // put the answer as a separate attribute
        sessionAttributes.correctAnswer = get_city_name(country, city);
        sessionAttributes.related = get_country_for_a_city(country);

        sessionAttributes.hints_used = 1;


        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        say += question


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const GuessTheCountryIntent_Handler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'GuessTheCountryIntent';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        var country = getRandomCountry();


        let say = 'The hint is : ';
        var hints_json = get_questions_country(country);

        sessionAttributes.current_hint = '';
        var question = hints_json.pop();
        sessionAttributes.allHints = hints_json;

        sessionAttributes.state = states.COUNTRY;

        // put an attribute with all the questions
        // put the answer as a separate attribute
        sessionAttributes.correctAnswer = get_country_name(country)

        sessionAttributes.hints_used = 1;


        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        say += question



        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};





const SpecialGameIntent_Handler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'SpecialGameIntent';
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let slotValues = getSlotValues(request.intent.slots);

        let say = '';

        if (slotValues.Country.heardAs) {
            var country = found_country(slotValues.Country.heardAs);
            if (country !== null) {

                var city = getRandomCity(country);
                say = 'Let\'s begin the game. '
                say += 'The first hint is : ';
                var hints_json = get_questions_city(country, city);

                sessionAttributes.current_hint = '';
                var question = hints_json.pop();
                sessionAttributes.allHints = hints_json;

                sessionAttributes.state = states.SPECIAL;

                // put an attribute with all the questions
                // put the answer as a separate attribute
                sessionAttributes.correctAnswer = get_city_name(country, city);
                sessionAttributes.related = slotValues.Country.heardAs;

                sessionAttributes.hints_used = 1;


                handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

                say += question
            }
            else {
                say += 'Sorry, try a different country. '
            }

        }


        if ((slotValues.Country.ERstatus === 'ER_SUCCESS_NO_MATCH') || (!slotValues.Country.heardAs)) {
            say += 'Sorry, try a different country. '
        }







        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};


const GiveUpIntent_Handler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        return request.type === 'IntentRequest'
            && request.intent.name === 'GiveUpIntent'
            && (attributes.state === states.CITY
                || attributes.state === states.COUNTRY
                || attributes.state === states.SPECIAL);
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'The correct answer was : ';
        // if the country is stored
        if (sessionAttributes.states == states.SPECIAL || sessionAttributes.states == states.CITY) {
            say += sessionAttributes.correctAnswer + ' , from ';
            say += sessionAttributes.related + ' .';
        }
        else {
            say += sessionAttributes.correctAnswer + ' .';
        }

        say += ' You can play a different game, or exit.'
        sessionAttributes.state = states.START;

        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const LaunchRequest_Handler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const responseBuilder = handlerInput.responseBuilder;

        //let say = 'hello' + ' and welcome to ' + invocationName + ' ! Say help to hear some options.';



        let say = '<prosody pitch="medium"> <prosody volume="x-loud">WELCOME!</prosody> </prosody>';
        say += "<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_intro_01'/>";
        say += ' I have 3 games for you: <break time="1s"/>';
        say += ' You can try to guess a city, a country or play my special game, where you will give me a country and you will try to guess the city from that country.';
        say += ' What would you like to do?'
        
        //let skillTitle = capitalize(invocationName);


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const SessionEndedHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const request = handlerInput.requestEnvelope.request;

        console.log(`Error handled: ${error.message}`);
        // console.log(`Original Request was: ${JSON.stringify(request, null, 2)}`);

        return handlerInput.responseBuilder
            .speak('Sorry, I\'m not sure what you meant. Say "help" for more options. ')
            //.speak('Sorry, an error occurred.  Please say again.')
            .reprompt('Sorry, an error occurred.  Please say again.')
            .getResponse();
    }
};


// 2. Constants ===========================================================================

// Here you can define static data, to be used elsewhere in your code.  For example: 
//    const myString = "Hello World";
//    const myArray  = [ "orange", "grape", "strawberry" ];
//    const myObject = { "city": "Boston",  "state":"Massachusetts" };

const APP_ID = undefined;  // TODO replace with your Skill ID (OPTIONAL).

// 3.  Helper Functions ===================================================================

function capitalize(myString) {

    return myString.replace(/(?:^|\s)\S/g, function (a) { return a.toUpperCase(); });
}


function randomElement(myArray) {
    return (myArray[Math.floor(Math.random() * myArray.length)]);
}

function stripSpeak(str) {
    return (str.replace('<speak>', '').replace('</speak>', ''));
}




function getSlotValues(filledSlots) {
    const slotValues = {};

    Object.keys(filledSlots).forEach((item) => {
        const name = filledSlots[item].name;

        if (filledSlots[item] &&
            filledSlots[item].resolutions &&
            filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
            switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
                case 'ER_SUCCESS_MATCH':
                    slotValues[name] = {
                        heardAs: filledSlots[item].value,
                        resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
                        ERstatus: 'ER_SUCCESS_MATCH'
                    };
                    break;
                case 'ER_SUCCESS_NO_MATCH':
                    slotValues[name] = {
                        heardAs: filledSlots[item].value,
                        resolved: '',
                        ERstatus: 'ER_SUCCESS_NO_MATCH'
                    };
                    break;
                default:
                    break;
            }
        } else {
            slotValues[name] = {
                heardAs: filledSlots[item].value,
                resolved: '',
                ERstatus: ''
            };
        }
    }, this);

    return slotValues;
}



function sayArray(myData, penultimateWord = 'and') {
    let result = '';

    myData.forEach(function (element, index, arr) {

        if (index === 0) {
            result = element;
        } else if (index === myData.length - 1) {
            result += ` ${penultimateWord} ${element}`;
        } else {
            result += `, ${element}`;
        }
    });
    return result;
}

function getSampleUtterance(intent) {

    return randomElement(intent.samples);

}

function getPreviousIntent(attrs) {

    if (attrs.history && attrs.history.length > 1) {
        return attrs.history[attrs.history.length - 2].IntentRequest;

    } else {
        return false;
    }

}

function getPreviousSpeechOutput(attrs) {

    if (attrs.lastSpeechOutput && attrs.history.length > 1) {
        return attrs.lastSpeechOutput;

    } else {
        return false;
    }

}

function timeDelta(t1, t2) {

    const dt1 = new Date(t1);
    const dt2 = new Date(t2);
    const timeSpanMS = dt2.getTime() - dt1.getTime();
    const span = {
        "timeSpanMIN": Math.floor(timeSpanMS / (1000 * 60)),
        "timeSpanHR": Math.floor(timeSpanMS / (1000 * 60 * 60)),
        "timeSpanDAY": Math.floor(timeSpanMS / (1000 * 60 * 60 * 24)),
        "timeSpanDesc": ""
    };


    if (span.timeSpanHR < 2) {
        span.timeSpanDesc = span.timeSpanMIN + " minutes";
    } else if (span.timeSpanDAY < 2) {
        span.timeSpanDesc = span.timeSpanHR + " hours";
    } else {
        span.timeSpanDesc = span.timeSpanDAY + " days";
    }


    return span;

}


const InitMemoryAttributesInterceptor = {
    process(handlerInput) {
        let sessionAttributes = {};
        if (handlerInput.requestEnvelope.session['new']) {

            sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

            let memoryAttributes = getMemoryAttributes();

            if (Object.keys(sessionAttributes).length === 0) {

                Object.keys(memoryAttributes).forEach(function (key) {  // initialize all attributes from global list 

                    sessionAttributes[key] = memoryAttributes[key];

                });

            }
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);


        }
    }
};

const RequestHistoryInterceptor = {
    process(handlerInput) {

        const thisRequest = handlerInput.requestEnvelope.request;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let history = sessionAttributes['history'] || [];

        let IntentRequest = {};
        if (thisRequest.type === 'IntentRequest') {

            let slots = [];

            IntentRequest = {
                'IntentRequest': thisRequest.intent.name
            };

            if (thisRequest.intent.slots) {

                for (let slot in thisRequest.intent.slots) {
                    let slotObj = {};
                    slotObj[slot] = thisRequest.intent.slots[slot].value;
                    slots.push(slotObj);
                }

                IntentRequest = {
                    'IntentRequest': thisRequest.intent.name,
                    'slots': slots
                };

            }

        } else {
            IntentRequest = { 'IntentRequest': thisRequest.type };
        }
        if (history.length > maxHistorySize - 1) {
            history.shift();
        }
        history.push(IntentRequest);

        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    }

};




const RequestPersistenceInterceptor = {
    process(handlerInput) {

        if (handlerInput.requestEnvelope.session['new']) {

            return new Promise((resolve, reject) => {

                handlerInput.attributesManager.getPersistentAttributes()

                    .then((sessionAttributes) => {
                        sessionAttributes = sessionAttributes || {};


                        sessionAttributes['launchCount'] += 1;

                        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

                        handlerInput.attributesManager.savePersistentAttributes()
                            .then(() => {
                                resolve();
                            })
                            .catch((err) => {
                                reject(err);
                            });
                    });

            });

        } // end session['new'] 
    }
};


const ResponseRecordSpeechOutputInterceptor = {
    process(handlerInput, responseOutput) {

        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let lastSpeechOutput = {
            "outputSpeech": responseOutput.outputSpeech.ssml,
            "reprompt": responseOutput.reprompt.outputSpeech.ssml
        };

        sessionAttributes['lastSpeechOutput'] = lastSpeechOutput;

        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    }
};

const ResponsePersistenceInterceptor = {
    process(handlerInput, responseOutput) {

        const ses = (typeof responseOutput.shouldEndSession == "undefined" ? true : responseOutput.shouldEndSession);

        if (ses || handlerInput.requestEnvelope.request.type == 'SessionEndedRequest') { // skill was stopped or timed out 

            let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

            sessionAttributes['lastUseTimestamp'] = new Date(handlerInput.requestEnvelope.request.timestamp).getTime();

            handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);

            return new Promise((resolve, reject) => {
                handlerInput.attributesManager.savePersistentAttributes()
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });

            });

        }

    }
};



// 4. Exports handler function and setup ===================================================
const skillBuilder = Alexa.SkillBuilders.standard();
exports.handler = skillBuilder
    .addRequestHandlers(
        AMAZON_CancelIntent_Handler, 
        AMAZON_HelpIntent_Handler, 
        AMAZON_StopIntent_Handler, 
        AMAZON_NavigateHomeIntent_Handler, 
        AnswerIntent_Handler, 
        GuessTheCityIntent_Handler, 
        GuessTheCountryIntent_Handler, 
        SpecialGameIntent_Handler, 
        GiveUpIntent_Handler, 
        LaunchRequest_Handler, 
        SessionEndedHandler
    )
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(InitMemoryAttributesInterceptor)
    .addRequestInterceptors(RequestHistoryInterceptor)

   // .addResponseInterceptors(ResponseRecordSpeechOutputInterceptor)

 // .addRequestInterceptors(RequestPersistenceInterceptor)
 // .addResponseInterceptors(ResponsePersistenceInterceptor)

 // .withTableName("askMemorySkillTable")
 // .withAutoCreateTable(true)

    .lambda();