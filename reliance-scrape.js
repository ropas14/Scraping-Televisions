var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');

const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/";
var dbo="";
// connecting to mongo
MongoClient.connect(url, function(err, db) {
  if (err) {isfound=false;
    return;};
  dbo = db.db("reliancedigital");
  });

//var START_URL='http://localhost//Reliance%20Digital.html';
var START_URL='http://www.reliancedigital.in/tvs-audio/flat-television.html';
var pagesVisited = {};
var numPagesVisited = 0;
var pagesToVisit =[START_URL];
for(var i=1;i<10;i++){
  pagesToVisit.push(START_URL+'?p='+i);
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
        var linkSelectors=`div#fme_layered_container div.category-products div.listpage-products-window ul li a`;
           var count=0;
           $("ul li a").each(function() {
              var link = $(this).attr('href');
               if(link && link!="#" && link.toLowerCase().indexOf('television')>=0){
                    if(link.startsWith("/")){
                        link =baseUrl+link;
                    }
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
      var description =$("div.product-shop div.product-name").text();
      var price =$("div.pdp_common_div div.pdp_price div.pdp_new_amount").text();
      var key_features=$("div.pdp_common_div li").text();
      var items= {
                   description:description.trim(),
                   price:price.trim(),
                   url:url
               };
      $('div.pdp_browse table.pdp_table tbody tr').each(function() {
        var i=0;
        var key;
        $('td').each(function() {
          if(i==1){
            key=$(this).text().trim();
          }else if(i==2){
            var  value=$(this).text().trim();
            if(key && value){
              key =key.split(' ').join('_');
              items[key]=value;
            //  console.log(key+'========'+value);
             i=0;
           }else if (!key ){
              key=value;
              i=1;
            }

          }
          i++;
        });

      });
      if( price){
        numItems++;
        console.log("  === .."+items.description);
        dbo.collection("products").insertOne(items, function(err, res) {
                console.log(`1 document inserted. ${numItems} items scraped and saved so far`);
        });

      }
    }
crawl();
