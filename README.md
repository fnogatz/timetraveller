# Timetraveller

Webservice to explore location- and time-based data like GTFS in an interactive way.

## Installation

```shell
git clone https://github.com/fnogatz/timetraveller.git
cd timetraveller
npm install
```

## Maps

The available maps are configured by YAML files in the `/maps` directory. Simply copy the provided `example.yml` and change it to fit your needs.

### Creation

Create a new YAML file in the `/maps` directory. The filename will be map's identifier. That means if you save a `my-map.yml`, this map will be accessable as `http://domain.tld/my-map`.

The following options are supported:

```yaml
map:
  # name gets displayed in the header
  name: Some short name
  # default center of the map
  center: [ 48.400833333333, 9.9872222222222 ]
  # default zoom level
  zoom: 13

# You have to specify a model connector that handles
#   the geospatial queries. See below for a list of
#   available connectors.
connector:
  # require-able path
  path: example-connector
```

## Server

You can start the webserver by calling:

```shell
npm start
```

## Model Connectors

This is a list of currently implemented connectors.

- [timetraveller-mongodb](https://github.com/fnogatz/timetraveller-mongodb): Connector for MongoDB

### Write your own

[TODO]
