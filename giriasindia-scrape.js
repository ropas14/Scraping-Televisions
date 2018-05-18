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
  dbo = db.db("giriasindia");
  });


var START_URL='https://www.giriasindia.com/index.php/catalogsearch/result/?q=tv';
var pagesVisited = {};
var numPagesVisited = 0;
var pagesToVisit =[START_URL];

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
  if(url.endsWith('html')){
      console.log("Visiting page " + url);
  }
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
        var linkSelectors=`dl#narrow-by-list dd ol li a,
                           div.col-main div.category-products ul.products-grid li.item.last a.product-image`;
           var count=0;
           $(linkSelectors).each(function() {
              var link = $(this).attr('href');
               if(link && link!="#" ){
                    if(link.startsWith("/")){
                        link =baseUrl+link;
                    }
                    count++;
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
      var brand =$("div.product-shop div.product-name span.h1").text().trim();
      var price ='';
      var discount='';
      var count=0;
      $("div.price-box>p.special-price>span.price").each(function() {
        if(count==0){
          price= $(this).text().trim();
        }else if(count==1){
           discount= $(this).text().trim();
        }
        count++;
      });


      if(!price){
         price =$("div.price-box>span.regular-price span.price").text().trim();
      }
      //
      discount=$("div.price-box p.special-price span#product-price").text().trim();
      var items= {
                   brand:brand.trim(),
                   price:price.trim(),
                   discount:discount.trim(),
                   url:url
      };
      console.log(` ====brand : ${items.brand}==== price : ${items.price}==== discount: ${items.discount}`);
      if( price && brand){
        numItems++;
        dbo.collection("products").insertOne(items, function(err, res) {
                console.log(`1 document inserted. ${numItems} items scraped and saved so far`);
        });

      }else{
        console.log(` ${url}`);
      }
    }
crawl();
