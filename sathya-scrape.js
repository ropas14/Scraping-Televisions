var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');

const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/";
var dbo="";
// connecting to mongo
MongoClient.connect(url, function(err, db) {
  if (err) {isfound=false; return;};
  dbo = db.db("satha");
  });

var START_URL='https://www.sathya.in/led-television';

var pagesVisited = {};
var numPagesVisited = 0;
var pagesToVisit =[START_URL];
 for(var i=1;i<30;i++){
   pagesToVisit.push(START_URL+'?i='+i);

 }
var pagesUrls=[];
var numItems=0;

const urll = new URL(START_URL);
const baseUrl=urll.protocol + "//" + urll.hostname;

const MAX_VISITS = 1000;
function crawl() {
  if(pagesToVisit.length<=0 ) {
    console.log(`visited all pages. ${numItems} items scraped and saved`);
    //close db con
     return;
  }
  var nextPage = pagesToVisit.shift();
  console.log(`<<<<<<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>> left with ${pagesToVisit.length} pages to visit`)
  if (nextPage in pagesVisited) {
    // We've already visited this page, so repeat the crawl
    crawl();
  } else {
    // New page we haven't visited
    if(nextPage==null){
      return;
    }
    numPagesVisited++;
    visitPage(nextPage, crawl);
  }
}
function requestPage(url, callback) {
  var agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36';
  var options = {
      url: url,
      headers: {
           'User-Agent': agent
        }
      };

  return new Promise(function(resolve, reject) {
      // Do async job
        request.get(options, function(err, resp, body) {
            if (err) {
                reject(err);
                callback();
            } else {
                resolve(body);
            }
        })
    })
}
function visitPage(url, callback) {
  // Add page to our set
  pagesVisited[url] = true;
  // Make the request
  console.log("Visiting page " + url);
  var requestPag = requestPage(url,callback);
  requestPag.then(function(body) {
    var $ = cheerio.load(body);
    collectLinks($);
    scrapeItem($,url);
    callback();
  }, function(err) {
        console.log(err);
        callback ();
    })
  }
  // google.search
  function collectLinks($) {
     console.log(` ====  collecting Links`);
       var linkSelectors=`div.slick-list div.slick-track article div.art-data-block div.art-info-block h3.art-name a,
                       div.slick-track article div.art-picture-block a.art-picture,
                        div.page-body div article.art div.art-picture-block a,
                       div.product-list-container div article div.art-picture-block a,
                       div.page-body div.product-list-container div div a.btn`;
           var count=0;
           $(linkSelectors).each(function() {
             var link = $(this).attr('href');
             if(link!="#"){
               if(link.startsWith("/")){
                  link =baseUrl+link;
                }
               //count++;
               //console.log(`${count} ==== ${link}`);
               if (link in pagesVisited) {
               }else {
                 if (link in pagesToVisit) {
                 }else{
                     pagesToVisit.push(link);
                 }
               }
             }
      });
    }
    function scrapeItem($,url){
      var brand =$("form#pd-form section aside div.pd-info div.page-title h1").text();
      var price =$("div.pd-offer-price-container div.pd-offer-price div.pd-group div.clearfix div.pd-price-block div.pd-price").text();
      var description =$(" div.more-block section#super-tech div.container p").text();
      if(brand && price){
        numItems++;
         var item={
           brand:brand.trim(),
           price :price.trim(),
           url:url
         }
          if(description){
             item.description =description.trim()
          }

         dbo.collection("products").insertOne(item, function(err, res) {
                console.log(`1 document inserted. ${numItems} items scraped and saved so far`);
        });
        console.log(''+item);
      }


    }
crawl();
