var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/api/data/viralloads', function(req, res, next) {
  let phonyData = [
    {
        "label": "Star-belly Sneetches",
        "data": [
            {
                "viralLoadLog": 0,
                "negatives": 10,
                "positives": 0
            },
            {
                "viralLoadLog": 1,
                "negatives": 50,
                "positives": 0
            },
            {
                "viralLoadLog": 2,
                "negatives": 160,
                "positives": 0
            },
            {
                "viralLoadLog": 3,
                "negatives": 100,
                "positives": 20
            },
            {
                "viralLoadLog": 4,
                "negatives": 10,
                "positives": 48
            },
            {
                "viralLoadLog": 5,
                "negatives": 2,
                "positives": 148
            },
            {
                "viralLoadLog": 6,
                "negatives": 0,
                "positives": 148
            },
            {
                "viralLoadLog": 7,
                "negatives": 0,
                "positives": 248
            },
            {
                "viralLoadLog": 8,
                "negatives": 0,
                "positives": 148
            },
            {
                "viralLoadLog": 9,
                "negatives": 0,
                "positives": 200
            },
            {
                "viralLoadLog": 10,
                "negatives": 0,
                "positives": 100
            },
            {
                "viralLoadLog": 11,
                "negatives": 0,
                "positives": 20
            },
            {
                "viralLoadLog": 12,
                "negatives": 0,
                "positives": 1
            }
        ],
        "colors": {
            "negatives": "hsl(90,80%,50%)",
            "positives": "hsl(90,80%,85%)"
        }
    },
    {
        "label": "Non-star-belly Sneetches",
        "data": [
            {
                "viralLoadLog": 0,
                "negatives": 0,
                "positives": 0
            },
            {
                "viralLoadLog": 1,
                "negatives": 40,
                "positives": 5
            },
            {
                "viralLoadLog": 2,
                "negatives": 123,
                "positives": 9
            },
            {
                "viralLoadLog": 3,
                "negatives": 80,
                "positives": 9
            },
            {
                "viralLoadLog": 4,
                "negatives": 8,
                "positives": 17
            },
            {
                "viralLoadLog": 5,
                "negatives": 20,
                "positives": 64
            },
            {
                "viralLoadLog": 6,
                "negatives": 20,
                "positives": 77
            },
            {
                "viralLoadLog": 7,
                "negatives": 20,
                "positives": 99
            },
            {
                "viralLoadLog": 8,
                "negatives": 10,
                "positives": 98
            },
            {
                "viralLoadLog": 9,
                "negatives": 0,
                "positives": 83
            },
            {
                "viralLoadLog": 10,
                "negatives": 0,
                "positives": 40
            },
            {
                "viralLoadLog": 11,
                "negatives": 0,
                "positives": 12
            },
            {
                "viralLoadLog": 12,
                "negatives": 0,
                "positives": 3
            }
        ],
        "colors": {
            "negatives": "hsl(270,80%,50%)",
            "positives": "hsl(270,80%,85%)"
        }
    }
  ];
  res.json(phonyData);
})

module.exports = router;
