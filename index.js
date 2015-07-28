
var express = require('express');
var AWS = require('aws-sdk');
var unique = require('array-uniq');

var app = express();

var AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
var AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
var S3_BUCKET = process.env.S3_BUCKET;
var S3_ENDPOINT = process.env.S3_ENDPOINT;
var PUBLIC_S3_ENDPOINT = process.env.PUBLIC_S3_ENDPOINT;
var FORCE_PATH_STYLE = !!process.env.FORCE_PATH_STYLE;

var config = {
  s3ForcePathStyle: FORCE_PATH_STYLE,
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
  params: {
    Bucket: S3_BUCKET
  }
};
if (S3_ENDPOINT) {
  config.endpoint = new AWS.Endpoint(S3_ENDPOINT);
}
if (!PUBLIC_S3_ENDPOINT) {
  if (!FORCE_PATH_STYLE) {
    PUBLIC_S3_ENDPOINT = 'https://' + S3_BUCKET + '.s3.amazonaws.com';
  } else {
    PUBLIC_S3_ENDPOINT = S3_ENDPOINT || 'https://s3.amazonaws.com';
  }
}
console.log('Config', config)
console.log('Using internal S3 endpoint: ', S3_ENDPOINT);
console.log('Using public S3 endpoint: ', PUBLIC_S3_ENDPOINT);

var s3 = new AWS.S3(config);

app.use(function requestLogger(req, res, next) {
  console.log(req.method + ' ' + req.url);
  next();
});

function listProjects(prefix, res) {
  s3.listObjects({ Bucket: S3_BUCKET, Prefix: prefix }, function(err, result) {
    if (err) {
      console.log('Error', err);
      return res.status(500).json({
        status: 'error'
      });
    }
    var projects = result.Contents.map(function(x) {
      return x.Key;
    }).filter(function(key) {
      return key.indexOf('/_manifests/') > 0;
    }).map(function(key) {
      key = key.substring('docker/registry/v2/repositories/'.length);
      key = key.substring(0, key.indexOf('/_manifests/'));
      return key;
    });
    projects = unique(projects);
    res.json(projects);
  });
}

app.get('/v1/_projects', function(req, res, next) {
  listProjects('docker/registry/v2/repositories', res);
});

app.get('/v1/:username/_projects', function(req, res, next) {
  listProjects('docker/registry/v2/repositories/' + req.params.username, res);
});

app.get('/v1/:username/:project', function(req, res, next) {
  // TODO: Extract readme from image and add to response
  res.json({
    name: req.params.username + '/' + req.params.project
  });
});

var port = process.env.PORT || 5050;
app.listen(port, function() {
  console.log("Listening on " + port);
});
