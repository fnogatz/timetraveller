# Timetraveller

Webservice to explore location- and time-based data like GTFS in an interactive way.


## Requirements

* MongoDB: >= 2.4


## Usage

Adapt the config file first:

```
cp config.json.example config.json
edit config.json
```

### Import data

```
timetraveller import gtfs /path/to/gtfs/dir
```

### Webserver

```
timetraveller server
```
