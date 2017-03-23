# Defra digital services portfolio

[![Build Status](https://travis-ci.org/DEFRA/defra-portfolio.svg?branch=master)](https://travis-ci.org/DEFRA/defra-portfolio)
[![Dependency Status](https://david-dm.org/environmentagency/defra-portfolio.svg)](https://david-dm.org/DEFRA/defra-portfolio)

## View the portfolio
[Defra digital service portfolio](http://defra-digital-services.herokuapp.com/)

## Adding a new project
- Projects are configuration based in /lib/projects/
- Take a look at /lib/projects/defaults.js for a template of what a project should contain.
- Create a unique project file e.g. project.js, copy in the configuration, give the project a unique ID
- Commits to `master` will be deployed automatically to the site

Site content is maintained by @liammcmurray https://github.com/liammcmurray

### Credit

Credit to https://github.com/dwpdigitaltech/dwp-portfolio from where this site has been cloned and adjusted to Defra.
