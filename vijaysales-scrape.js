var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
const start_url = "https://www.vijaysales.com/Entertainment/Televisions/5/467";
let pagesVisited = {};
let promises = [];
let pagesUrls = [];
let numPagesVisited = 0;
let pagesToVisit = [];
let allinformation = [];
let orgUrl = new URL(start_url);
const baseUrl = orgUrl.protocol + "//" + orgUrl.hostname;

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
   return new Promise(function(resolve, reject) {
      // Asynchronous request and callback
      request.get(url, function(err, response, body) {
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
   let links = $('div.vj-srch-prd-main div.vj-pnaaz-plst div#gd-row_4 div.pb-bx-srch a.vj-cur-pnter');

 if(links!=""){  
  links.each(function(){
     var tv_link = $(this).attr("href");
         if (tv_link in pagesToVisit) {}
            else {
               if (tv_link in pagesVisited) {}
               else {
                  pagesToVisit.push(tv_link);
               }
            }
         }); 
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

      //saveToMongo.saveData(Items);
      allinformation.push(Items);
   }
}

function displayInformation($) {
   console.log(allinformation + "Total number of items = " + allinformation.length);

}