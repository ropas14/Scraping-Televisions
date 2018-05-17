var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
const start_url = "https://www.vijaysales.com/Entertainment/Televisions/5/467";
let pagesVisited = {};
let promises = [];
let numPagesVisited = 0;
let pagesToVisit = [];
let allinformation = [];
let orgUrl = new URL(start_url);
const baseUrl = orgUrl.protocol + "//" + orgUrl.hostname;

//let MongoClient = require('mongodb').MongoClient
//const mongourl = "mongodb://localhost:27017/"

function crawl() {
   if (pagesToVisit.length <= 0) {
      console.log("all pages have been visited");
      Promise.all(promises).then(function(values) {
            displayInformation();
            // saveToMongo.closeConnection();
         })
         .catch(error => {
            console.log(error, +'Promise error');
         });
      return;
   }
   let nextPage = pagesToVisit.pop();
   if (nextPage in pagesVisited) {
      // We've already visited this page, so repeat the crawl
      crawl();
   }
   else {
      // New page we haven't visited  
      visitPage(nextPage, crawl);
   }
}
async function visitPage(url, callback) {
   // Add page to our set
   pagesVisited[url] = true;
   numPagesVisited++;
   // Make the request
   console.log("Visiting page " + url);
   let pageReq = pageRequest(url, callback);
   promises.push(pageReq);
   await pageReq.then(function(body) {
         let $ = cheerio.load(body);
         collectLinks($);
         searchForContents($, url)
         callback();
      }, function(err) {
         console.log(err);
         callback();
      })
      .catch(error => {
         console.log(error, +'Promise error');
      });
}

function pageRequest(url, callback) {

   var agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36';
   var options = {
      url: url,
      headers: {
         'User-Agent': agent,
         'Content-Type': 'application/json; charset=UTF-8'
      }
   };

   return new Promise(function(resolve, reject) {
      // Asynchronous request and callback
      request.get(options, function(err, response, body) {
         if (err) {
            reject(err);
            callback();
         }
         else {
            resolve(body);
         }
      }).on('error', function(e) {
         console.log(e);
      }).end();
   });
}

var startindx = 1;
var endindx = 12;

function collectLinks($) {
   let links = $('div.vj-srch-prd-main div.vj-pnaaz-plst div#gd-row_4 div.pb-bx-srch a.vj-cur-pnter');
   var count = $("div.vj-flt-tilt.vj-flt-lft  span").text().split("-");
   var total_items = parseInt(count[0].trim());

   if (links != "") {

      if (startindx <= total_items) {

         for (var i = startindx; i <= total_items; i += 12) {

            var postdata = {
               "CategoryID": "5",
               "CityId": "1",
               "FilterValueIDs": "467,:",
               "FilterId": "2",
               "Keywords": "",
               "CategoryName": "",
               "EndIndex": endindx,
               "FilterName": "",
               "FilterValueName": "",
               "FlagPrice": "",
               "InStockOnly": 0,
               "MainFilterName": "",
               "MaxAmount": "608990.00",
               "MinAmount": "9490.00",
               "OfferType": 0,
               "PrimaryFilterID": "467",
               "SortBy": 0,
               "StartIndex": startindx,
               "fvalid": "467",
               "isScroll": true,
               "prdFilterVal": ""
            }

            let agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36';
            let optionz = {
               method: 'post',
               body: postdata,
               url: 'https://www.vijaysales.com/search.aspx/_getRHSProducts',
               headers: {
                  'User-Agent': agent,
                  'Content-Type': 'application/json; charset=UTF-8'
               },
               json: true
            };
            String.prototype.escapeSpecialChars = function() {
               return this.replace(/\"/g, '"')
                  .replace(/\\u003c/g, '<')
                  .replace(/\\u0027/g, "'")
                  .replace(/\\u003e/g, ">")
                  .replace(/\\r/g, "")
                  .replace(/\\n/g, "\n");

            };

            request(optionz, function(error, response, body) {
               if (error) {
                  console.error('error posting json: ', error)
                  throw error
               }
               var myJSONResult = JSON.stringify(body.d);
               var myEscapedJSONString = myJSONResult.escapeSpecialChars();
               //var address = myEscapedJSONString.match(/href=\\'https?:\/\/\S+'/g);
               var patt = /href=\\'https?:\/\/\S+/igm;
               while (match = patt.exec(myEscapedJSONString)) {
                  var address = '' + match + ''.substring((match.index + 1), (patt.lastIndex - 1));
                  var addres = '' + address + ''.match(/https?:\/\/\S+/g);
                  var arry = addres.split('\\');
                  var newUrl = arry[1];
                  newUrl = newUrl.split("\'");
                  var tv_link = newUrl[1];
                  console.log(tv_link);
                  pagesToVisit.push(tv_link);
                  //console.log(pagesToVisit);

               }

            });
            startindx += 12;
            endindx += 12;
         }

      }
   }

}

function searchForContents($, url) {
   let detailsHere = $('div.pd-rgt');

   if (detailsHere != "") {
      let brandAndModel = detailsHere.find('h1').text();
      let price = detailsHere.find('div.vj-btn-holder>div>div>div>div>div.vj-mrp-hlder-reg>div>span.vsp-spec-prc-reg').text();
      let tvfeatures = $('div.pd-rgt div ul li.vj-li-smkey');
      var features = [];
      tvfeatures.each(function() {
         let featre = $(this).text();
         features.push(featre);
      });

      var Items = {
         url: url,
         brand: brandAndModel,
         price: price,
         keyfeatures: features,

      };

      /*      MongoClient.connect(mongourl, function(err, db) {
           if (err) throw err;
           const dbo = db.db("vijaysales");
           dbo.collection("tvproducts").insertOne(Items, function(err, res) {
             if (err) throw err;

           });
         });*/

      allinformation.push(Items);
   }
}

function displayInformation() {
   console.log(allinformation.length);

}

pagesToVisit.push(start_url);
crawl();