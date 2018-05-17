var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
const start_url = "https://www.croma.com/entertainment/audio-video-tv/television/c/997";
let pagesVisited = {};
let promises = [];
let pagesUrls = [];
let numPagesVisited = 0;
let pagesToVisit = [];
let allinformation = [];
let orgUrl = new URL(start_url);
const baseUrl = orgUrl.protocol + "//" + orgUrl.hostname;

let MongoClient = require('mongodb').MongoClient
const mongourl = "mongodb://localhost:27017/"
// connecting to mongo
var dbo="";
MongoClient.connect(mongourl, function(err, db) {
  if (err) {throw err;
    return;}
   dbo = db.db("croma");
  });

pagesToVisit.push(start_url);
crawl();

function crawl() {
   if (pagesToVisit.length <= 0 ) {
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

  var agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36';
  var options = {
      url: url,
      headers: {
           'User-Agent': agent
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

function collectLinks($) {
   let nextPages = $('div.paginationBar.bottom div.right ul.pagination li a')
   let links = $('div.productGrid div ul.carousel div.gBox h2 a:nth-child(1)')

   if (links != "") {
      links.each(function() {
         let tv_link = $(this).attr('href');
         if (tv_link == null) {
            return;
         }
         if (tv_link.startsWith("/")) {
            var link = baseUrl + tv_link
            if (link in pagesToVisit) {}
            else {
               if (link in pagesVisited) {}
               else {
                  pagesToVisit.push(link);
               }
            }
         }
         else {
            if (link in pagesToVisit) {}
            else {
               if (tv_link in pagesVisited) {}
               else {
                  pagesToVisit.push(tv_link);
               }
            }
         }
      });
   }

   if (nextPages != "") {
      nextPages.each(function() {
         let page_link = $(this).attr('href');
         if (page_link == null) {
            return;
         }
         if (page_link.startsWith("/")) {
            var address = baseUrl + page_link
            if (address in pagesToVisit) {}
            else {
               if (address in pagesVisited) {}
               else {
                  pagesToVisit.push(address);
               }
            }

         }
         else {

            if (page_link in pagesToVisit) {}
            else {
               pagesToVisit.push(page_link);
            }
         }
      });
   }
}

function searchForContents($, url) {
   let detailsHere = $('div.productDetailsPanel ');

   if (detailsHere != "") {
      let brandAndModel = detailsHere.find('div  h1').text();
      let price = detailsHere.find('table h2').text();
      let tvfeatures = $('div.productDetailsPanel  div.features ul li');
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

     dbo.collection("cromaproducts").insertOne(Items, function(err, res) {
       if (err) throw err;
       console.log("----------saving " + Items.brand);

     });
  
      allinformation.push(Items);
   }
}

function displayInformation() {
   console.log("Total number of items = " +allinformation.length);

}