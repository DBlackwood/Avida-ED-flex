  // Process environment.cfg
  
  var av = av || {};  //incase av already exists
  var dijit = dijit || {};  //incase av already exists

  //============================================================================================ read environment.cfg ==
  // to make nutrient structure; and then to create user controls
  //-------------------------------------------------------------------------------------------- av.frd.findNameIndex --
  av.frd.findNameIndex = function(nutrientObj, rtag, geometry) {
    /*
     * 
     * @param nutrientObj =  the suboabject of av.nut that holds the arrays for logic9 type
     * @param rtag       the string that we are looking for. If the string is found data will be over written. 
     *                     if not, create a new entry in the arrays
     * @returns {Int}
     * 
     * Look for rtag in structure
     * return its index if it exists
     * return length + 1 is it does not exist
     */
    
    //var geometry = String (geometry_);
    //console.log('rtag=', rtag, '; geometry = ', geometry, '; nutrientObj=',nutrientObj);
    var defaultindex = nutrientObj.name.length;
    
    //console.log('rtag=', rtag, '; geometry = ', geometry, '; defaultindex=', defaultindex);
    if (undefined !== geometry) {
      if ('grid' === geometry.toLowerCase() && 1 > defaultindex) {
        defaultindex = 1;
      }
      else if ('global' === geometry.toLowerCase() && 1 > defaultindex) { 
        defaultindex = 0;
      };
    }
    else {console.log('why is geometry undefined: geometry = ', geometry);}

    var found = nutrientObj.name.indexOf(rtag);

    //onsole.log('defaultindex = ',  defaultindex, '; name.length = ', nutrientObj.name.length, 'found=', found );

    if (-1 < found) {
      //console.log('The name ', rtag, ' was found already in av.nut;   The subobject=',nutrientObj);
      return found;
    } 
    //if (av.dbg.flg.nut) { console.log('defaultindex=',defaultindex,'; rtag='+rtag, '; found=', found, '; nutrientObj.name=', nutrientObj.name); }
    return defaultindex;  
  };
  //---------------------------------------------------------------------------------------- end av.frd.findNameIndex --

  // Avida reacton line format
  // REACTION reactionName taskName process:resource=resourceName:value=2:type=pow:max=1.1:min=0.9 requisite:max_count=1
  // Avida-ED 3 version for no resource is 
  // REACTION ANDN andn process:value=0.0:type=pow requisite:max_count=1  #value=3.0
  //
  // For now in Avida-ED 4.0 beta; the the Resource MUST be defined before the Reaction for that resource. 

  //------------------------------------------------------------------------------------------- av.frd.reActLineParse --
  av.frd.reActLineParse = function(lnArray, from) {
    'use strict';
    //if (av.dbg.flg.nut) { console.log('Nut: ', from, ' called av.frd.reActLineParse'); }
    var lnError = '';     //was it a valid line wihtout errors
//    if (av.dbg.flg.nut) { console.log('Nut: av.frd.reActLineParse: lnArray = ', lnArray); }
    var pear = [];
    var nn;

    var logicindex = av.sgr.logicVnames.indexOf( lnArray[2] );   //task name length is variable so must fined in that the correct list of logic functions
    //console.log('logicindex=',logicindex);
    if (-1 < logicindex) {
      var numTsk = av.sgr.logEdNames[logicindex];
      // Checking for a resource tag
      //console.log('numTsk=', numTsk);
      var reActObj = av.nut[numTsk].react;   //objec based on logic type and reaction;
      //console.log('numTsk=', numTsk,'; lnArray', lnArray);
      //console.log('av.nut.'+numTsk+'.uiAll.geometry = ');

//      if (av.dbg.flg.nut) { console.log('av.nut['+numTsk+'].uiAll = ',av.nut[numTsk].uiAll); }

      var ndx = av.frd.findNameIndex(reActObj, lnArray[1], av.nut[numTsk].uiAll.geometry);
      reActObj.name[ndx] = lnArray[1];   //assin the name of the resource. 
      //console.log('REACT: ndx = ', ndx, '; lnArray[1]', lnArray[1], 'reactName=', reActObj.name, 'uiAll.geometry=', av.nut[numTsk].uiAll.geometry );

      var len;
      var lngth = lnArray.length;
      //console.log('REACT: ndx=',ndx, '; name=lnArray[1]=',lnArray[1],'; task=',lnArray[2], '; numTsk=', numTsk, '; lnArray.length=', lnArray.length);
      for (var jj=3; jj<lngth ;jj++) {
        var pairArray = lnArray[jj].split(':');    //this should get process
        len = pairArray.length;    
        //console.log('len=',len,'; pairArray=',pairArray);
        for (var ii=1; ii < len; ii++) {
          pear = pairArray[ii].split('=');
          //console.log('React: ii=',ii,'; pear', pear);
          nn = av.sgr.react_argu.indexOf(pear[0].toLowerCase());
          if (-1 < nn) {
            reActObj[av.sgr.react_argu[nn]][ndx] = pear[1];
          }
          else {
              lnError = ' '+pear[0]+' is not a valid reaction keyword. lnArray = '+lnArray;
              //console.log(lnError);
          };
        };
      };
      //console.log('av.nut['+numTsk+'].react=', av.nut[numTsk].react);
    }
    // valid logic name not found;
    else {
      lnError = 'react task, |'+ lnArray[2]+'| not found in av.sgr.logicVnames';
      console.log(lnError+':', av.sgr.logicVnames);
    };

    return lnError;
  };
  //--------------------------------------------------------------------------------------- end av.frd.reActLineParse --

  //--------------------------------------------------------------------------------------- av.frd.reSrcNameBasedInfo --
  // this function puts data in av.nut.[numTsk].uiAll and uiSub[sub] based on the name of the resource;
  av.frd.reSrcNameBasedInfo = function(numTsk, sub) {
    var re_name = /(\D+)(\d+)([qn])(.*$)/;    // match array = whole line? , task, region number, data about things with a side (gradient, flow), else NULL
    var re_region = /(\D+)(\d+)(.*$)/;    // match array = whole line? , task, region number, data about things with a side (gradient, flow), else NULL    
   
    nameRCR = av.nut[numTsk].resrc.name[sub];
    
    // resource name matches resource in reaction cfg line.
    // Reaction names a Resource; Need to find info about that resource to determine Supply Type. SupplyTypes will
    // be determined after the entire file has beeen read to make sure the named resource  is in the (nut)rient structure 

    //if (av.dbg.flg.nut) console.log('Nut: reSrcLineParse: pairArray=', pairArray);
    //find logic type include test for quarters vs ninths subregion layout. 
    matchTaskRegion = nameRCR.match(re_name);  // Matches using re_name pattern: looing for tsk##q
    //if (av.dbg.flg.nut) console.log('nut: name =', av.nut[numTsk].resrc.name[sub],'; re_name=', re_name, ', matchTaskRegion=', matchTaskRegion);
    if (null == matchTaskRegion) {
      matchTaskRegion = nameRCR.match(re_region);  // Matches using re_num pattern.
      //console.log('nut: reSrc pairArra[0]=', nameRCR,'; re_region=', re_region, ', matchTaskRegion=', matchTaskRegion);
      if (null != matchTaskRegion) {
        //assume 'q' for quarters if suffix letter indicating subregion layout not included. 
        matchTaskRegion[4] = matchTaskRegion[3];   //                                   1 2
        matchTaskRegion[3] = 'q';  //q=quarters for a dish divided in 4 regions.        3 4      with 00 = whole dish
                                   //n=ninths for a dish divided into ninths as layed out on a phone with 000 = whole dish (not implemented)
      }
    }
    if (null == matchTaskRegion) {
      console.log('ERROR: RESOURCE name format wrong; nameRCR=', nameRCR);
    } else {
      //console.log('nut: nameRCR=', nameRCR,', matchTaskRegion=', matchTaskRegion);
      var tsk =  matchTaskRegion[1];

      //Find region
      //console.log('RESOURCE: matchTaskRegion=', matchTaskRegion);
      //to add a leading zero if needed and add if code is based on 4 quarters or 9 octothorpe
      regionStr = ('000'+ matchTaskRegion[2]).slice(-3);
      //console.log('regionStr=', regionStr);
      av.nut[numTsk].uiSub.regionSet[sub] = matchTaskRegion[3];
      av.nut[numTsk].uiSub.regionCode[sub] = regionStr;   //This is a one to three digit string with leading zeros.
      av.nut[numTsk].uiSub.regionNdx[sub] = av.sgr.regionQuarterCodes.indexOf(regionStr);

      //console.log('av.nut['+numTsk+'].uiSub.regionNdx['+sub+']=', av.nut[numTsk].uiSub.regionNdx[sub]);
      av.nut[numTsk].uiSub.regionName[sub] = av.sgr.regionQuarterNames[av.nut[numTsk].uiSub.regionNdx[sub]];
      //if (av.dbg.flg.nut) { console.log('Nut: RESOURCE: av.nut['+numTsk+'].uiSub.regionCode['+sub+']=', av.nut[numTsk].uiSub.regionCode[sub],'; av.nut[numTsk].uiSub.regionName[sub]=',av.nut[numTsk].uiSub.regionName[sub]); }
      //if (av.dbg.flg.nut) { console.log('Nut: RESOURCE: av.num['+numTsk+'].name['+sub+']=',av.nut[numTsk].resrc.name[sub]); }
    }
  };
  
  //----------------------------------------------------------------------------------- end av.frd.reSrcNameBasedInfo --

  //------------------------------------------------------------------------------------------- av.frd.reSrcLineParse --
  av.frd.reSrcLineParse = function(lnArray, from ){
    'use strict';
    var lineErrors = '';  //was it a valid line wih tout errors
    // if (av.dbg.flg.nut) { console.log('nut: ', from, ' called av.frd.reSrcLineParse'); }
    // if (av.dbg.flg.nut) { console.log('lnArray = ', lnArray); }
    var pairArray = lnArray[1].split(':');
    var pear = [];
    var cellboxdata = [];
    var len;
    var nn; 
    var numTsk;
    var rSourcObj;
    var geometry = '';
    var ndx;
    
    var tsk = pairArray[0].substr(0,3);
    //console.log('name=', pairArray[0], '; tsk=', tsk);
    var logicindex = av.sgr.logicNames.indexOf( tsk );
    if (-1 < logicindex) {
      numTsk = av.sgr.logEdNames[logicindex];
      // Checking for a resource tag
      rSourcObj = av.nut[numTsk].resrc;
      //console.log('numTsk='+numTsk,'; rSourcObj=', rSourcObj);

      // find geometry as global tasks are placed in index 0 within av.nut[numTsk].resrc[index]
      //if (av.dbg.flg.nut) console.log('numTsk=', numTsk,'; av.nut[numTsk].uiAll.geometry=', av.nut[numTsk].uiAll.geometry);
      len = pairArray.length;
      for (var ii=1; ii < len; ii++) {
        pear = pairArray[ii].split('=');
        //console.log('pear = ', pear);
        if ('geometry' === pear[0].toLowerCase() ) {
          geometry = pear[1];
          break;
        };   
      };
      if (av.dbg.flg.nut) { 
        //console.log('pairArray = ', pairArray);
        //console.log('; geometry['+numTsk+']=', geometry); 
      }

      // Set geometry: in Avida-ED, geometry=Grid or global; The user interface calls Grid = 'Local'
      //console.log('av.nut[numTsk].resrc.geometry['+sub+']=', av.nut[numTsk].resrc.geometry[sub]);
      //// console.log('av.nut['+numTsk+'].uiAll.geometry', av.nut[numTsk].uiAll.geometry);
      if ('grid' == geometry || 'global' == geometry ) {
        av.nut[numTsk].uiAll.geometry = geometry;
      }
      else { 
        console.log('ERROR: geometry was not set correctly in environment.cft *********************************');
        console.log('pairArray=', pairArray);
      };

      // check to make sure name is unqiue. If it is not unique then overright the previous data. 
      // index into all the arrays that hold resource/reaction parameters; The name should be unique for all arrays in the object. 
      ndx = av.frd.findNameIndex(rSourcObj, pairArray[0], av.nut[numTsk].uiAll.geometry);   
      //console.log('RESROUCE: ndx=',ndx, '; tsk=',tsk, '; name=', pairArray[0], 'resrcName=', rSourcObj.name, 'uiAll.geometry=', av.nut[numTsk].uiAll.geometry );
      //if (av.dbg.flg.nut) { console.log('ndx=',ndx); }
      if (-1 < ndx) {
        rSourcObj.name[ndx] = pairArray[0];    //asign the name of the resource statement. 
        av.nut[numTsk].resrc.geometry[ndx] = geometry;

        //Find information based on resource name
        av.frd.reSrcNameBasedInfo(numTsk, ndx);

        // assign default values are from https://github.com/devosoft/avida/wiki/Environment-file with a few exceptions
        // defaults are put directly in the dom

        // boxflag is false indicating there are no box values. 
        rSourcObj.boxflag[ndx] = false;

        //process all data pairs
        len = pairArray.length;
        //console.log('len=',len,'; pairArray=',pairArray);
        for (var ii=1; ii < len; ii++) {
          pear = pairArray[ii].split('=');
          nn = av.sgr.resrc_argu.indexOf(pear[0].toLowerCase());
          //if (av.dbg.flg.nut) { console.log('Resource: ii=',ii,'; pear=', pear, '; nn=', nn); }
          if (-1 < nn) {
            rSourcObj[av.sgr.resrc_argu[nn]][ndx] = pear[1];
            //console.log('av.sgr.resrc_argu[nn]=',av.sgr.resrc_argu[nn], '; value =', rSourcObj[av.sgr.resrc_argu[nn]][ndx] );
          }
          else {
            //console.log('pear= ', pear[0]);
            if ('cellbox' === pear[0].toLowerCase()) {
              cellboxdata = pear[1].split('|');
              //console.log('cellboxdata=',cellboxdata);
              rSourcObj.boxflag[ndx] = true;
              rSourcObj.boxx[ndx] = cellboxdata[0];
              rSourcObj.boxy[ndx] = cellboxdata[1];
              rSourcObj.boxcol[ndx] = cellboxdata[2];
              rSourcObj.boxrow[ndx] = cellboxdata[3];
              //console.log('rSourcObj.boxrow[ndx]=', rSourcObj.boxrow[ndx]);
            }
            else {
              lineErrors = 'leftside, '+pear[0]+', not a valid resource keyword. lnArray = '+lnArray;
              if (av.dbg.flg.nut) { console.log(lineErrors); }
            };
          };
        };   //end of proccessing data pairs
        // look for area based on inflow x & y values if they exist
        
        
      }  //end of valid ndx found for the subdish names
    }    //end of valid logic name
    else {
      // valid logic name not found;
      lineErrors = 'RESOURCE: pairArray.substring='+pairArray[0].substring(0,3)+' not found in av.sgr.logicNames';
      console.log(lineErrors);
    }
    //console.log('RESOURCE: lineErrors=', lineErrors);
    return lineErrors;
  };
  //--------------------------------------------------------------------------------------- end av.frd.reSrcLineParse --

  //------------------------------------------------------------------------------------------- av.frd.cell_LineParse --
  av.frd.cell_LineParse = function(lnArray, from) {
    'use strict';
    //if (av.dbg.flg.nut) { console.log('____', from, ' called av.frd.cell_LineParse _____'); }
    var lnError = '';     //was it a valid line wihtout errors
    var pair = lnArray[1].split(':');
    var len = pair.length;
    var pear = [];
    var ndx;
    var nn;

    // console.log('CELL lnArray = ', lnArray);
    // console.log('Resource = pair[0]=',pair[0]);
    var tsk = pair[0].substr(0,3);
    
    var logicindex = av.sgr.logicNames.indexOf(tsk);  
    //console.log('logicindex=',logicindex);
    if (-1 < logicindex) {
      var numTsk = av.sgr.logEdNames[logicindex];
      // console.log('numTsk=', numTsk);
      // Checking for a resource tag
//      rsrc = pair[0];
  //    ndx = av.nut[numTsk].resrc.indexOf(rsrc);
      ndx = av.nut[numTsk].resrc.name.indexOf(pair[0]);
      // console.log('CELL ndx=', ndx);
      if (0> ndx) {
        // console.log('CELL resource=', pair[0], 'is not in RESOURCE name list = ', av.nut[numTsk].resrc.name); 
        if ( av.nut[numTsk].resrc.name.length > av.nut[numTsk].cell.resrc.length) {
          ndx = av.nut[numTsk].resrc.name.length;s
        }
        else { ndx = av.nut[numTsk].cell.resrc.length; }
      };
      // console.log('av.nut['+numTsk+'].uiAll = ', av.nut[numTsk].uiAll);
      av.nut[numTsk].cell.resource[ndx] = pair[0];
      av.nut[numTsk].cell.list[ndx] = pair[1];
      // console.log('CELL: ndx = ', ndx, '; lnArray[1]', lnArray[1], 'cellResource=', av.nut[numTsk].cell.resource, 'uiAll.geometry=', av.nut[numTsk].uiAll.geometry );

      for (var ii=2; ii < len; ii++) {
        pear = pair[ii].split('=');
        // console.log('av.sgr.cell_argu=', av.sgr.cell_argu);
        nn = av.sgr.cell_argu.indexOf(pear[0].toLowerCase());
        if (av.dbg.flg.nut) { console.log('Resource: ii=',ii,'; pear=', pear, '; nn=', nn); }
        if (-1 < nn) {
          av.nut[numTsk].cell[av.sgr.cell_argu[nn]][ndx] = pear[1];
          // console.log('av.sgr.cell_argu['+nn+']=', av.sgr.cell_argu[nn]);
          // console.log('av.nut['+numTsk+'].cell[' + av.sgr.cell_argu[nn] +'['+ndx+']=', pear[1] );
        }
        else {
          // console.log('left side of pear not a cell argument: leftside = ', pear[0], 'cell arguments=', av.sgr.cell_argu);
        }
      }

    }
    // valid logic name not found;
    else {
      lnError = 'cell task in pair[0]=' + pair[0] + '; tsk='+ tsk + '; not found in av.sgr.logicNames = ', av.sgr.logicName;
      // console.log('CELL: lnError=',lnError);
    };
    // console.log('CELL: numtsk=', numTsk, '; nut.cell=', av.nut[numTsk].cell);
    return lnError;
  };
  //--------------------------------------------------------------------------------------- end av.frd.cell_LineParse --

  //-------------------------------------------------------------------------------------------- av.frd.nutrientParse --
  // Uses environment.cfg file to create a structure to hold environment variables.   uses av.nut
  av.frd.nutrientParse = function (filestr, from) {
    'use strict';
    if (av.dbg.flg.nut) { console.log('Nut:', from + ' called av.frd.nutrientParse =='); }
    var errors='';
    var reacError='', rsrcError='', cellError='';
    var eolfound;
    //var lineobj;
    var aline;
    var lines = filestr.split('\n');
    var lngth = lines.length;
    var matchComment, matchContinue, matchResult, metaData;
    var re_metaData = /^(.*?)#!.*$/;    //metadata 
    var re_comment =  /^(.*?)#.*$/;   //look at begining of the line and look until #; used to get the stuff before the #
    var re_continue = /^(.*?)\\/;  //look for continuation line
    var re_REACTION = /^(.*?)REACTION/i;
    var re_CELL = /^(.*?)CELL/i;
    var re_RESOURCE = /RESOURCE/i;
    var lineArray;
    var ii = 0;
    if (true) {
      console.log('start of av.frd.nutrientParse');
      av.nut_beforeParse = {};
      av.nut_beforeParse = JSON.parse(JSON.stringify(av.nut));
      console.log('av.nut_beforeParse = ', av.nut_beforeParse); 
    }

    while (ii < lngth) {
      eolfound = false;
      metaData = lines[ii].match(re_metaData);        //console.log("lines["+ii+"]=", lines[ii]);
      matchComment = lines[ii].match(re_comment);
      //if (null !== metaData) { console.log('metaData=', metaData); }   // not useing metadata, hope there is no neeed
      if (null !== matchComment) {aline = matchComment[1];}
      else aline = lines[ii];
      if (3 < aline.length) {
        //console.log('aline.length=', aline.length,'; aline=', aline);
        do {
          //console.log('ii', ii, '; eolfound=', eolfound,'; aline=', aline);
          if (ii+1 < lngth) {
            matchContinue = aline.match(re_continue);
            //console.log('matchContinue=',matchContinue);
            if (null !== matchContinue) {
              ii++;
              //console.log('ii=', ii);
              matchComment = lines[ii].match(re_comment);
              //console.log('matchComment=',matchComment);
              if (null !== matchComment) {aline = matchContinue[1]+matchComment[1];}
              else aline = matchContinue[1]+lines[ii];
            }
            else eolfound = true;
          }
          else eolfound = true;
          //console.log('ii', ii, '; eolfound=', eolfound,'; aline=', aline);
        }
        while (!eolfound)  //end of subloop for continuation lines
        //console.log('ii', ii, '; aline=', aline);
        // look for valid starting keyword
        lineArray = av.utl.spaceSplit(aline).split('~');      //change , to !; remove leading and trailing space and replaces white space with a ~, then splits on ~
        //console.log('lineArray=', lineArray);
        
        //look for a RESOURCE statement
        matchResult = lineArray[0].match(re_RESOURCE);
        //consolen('matchResource=', matchResult);
        if (null !== matchResult) { 
          rsrcError = av.frd.reSrcLineParse(lineArray, 'av.frd.nutrientParse');
          if ('' != rsrcError) console.log('reSrcLineParse: lineArray=', lineArray, '; rsrcError=', rsrcError);          
        }
        else {rsrcError = '';}

        //look for a REACTION statement
        matchResult = lineArray[0].match(re_REACTION);
        //console.log('matchReaction=', matchResult);
        if (null !== matchResult) { 
          //if (av.dbg.flg.nut) { console.log('reActLineParse: lnArray=', lineArray); }
          reacError = av.frd.reActLineParse(lineArray, 'av.frd.nutrientParse');
          if ('' != reacError)console.log('reActLineParse: lineArray=', lineArray, '; reacError=', reacError);          
        }
        else {
          reacError='';
          //console.log('no matach on REACTION');
        };

        //look for a CELL statement
        matchResult = lineArray[0].match(re_CELL);
        //console.log('matchReaction=', matchResult);
        if (null !== matchResult) { 
          //if (av.dbg.flg.nut) { console.log('cell_LineParse: lnArray=', lineArray); }
          cellError = av.frd.cell_LineParse(lineArray, 'av.frd.nutrientParse');
          if ('' != cellError) console.log('CELL_LineParse: lineArray=', lineArray, '; cellError=', cellError);          
        }
        else {
          cellError='';
          //console.log('no matach on REACTION');
        };

        if ('' !== rsrcError || '' !== reacError || '' != cellError) {
          console.log('-------------------------------------------------------errors in line: ii=', ii, '; aline=', aline);
          errors += 'ii='+ii+'; rsrcError='+rsrcError+'; reacError='+reacError+'; cellError='+cellError+'\n';
        };

      //if (av.dbg.flg.nut) console.log('--------------------- end of processing a line that was longer than 3 characters -------------------------------');
      }  //end of processing one line that was lines longer than 3 characters
      ii++;
    } // while that goes through lines in file. 
    
          //if (av.dbg.flg.nut) { 
    if (true) {
      console.log('end of av.frd.nutrientParse');
      av.nut_env_cfg = {};
      av.nut_env_cfg = JSON.parse(JSON.stringify(av.nut));
      console.log('av.nut_env_cfg = ', av.nut_env_cfg); 
    }
    if (av.dbg.flg.nut) { console.log('Nut: ================================ end of nutrientParse:  all environment.cfg lines processed =='); }
  };
  //------------------------------------------------------------------------------------- end of av.frd.nutrientParse --
    
  //Find subarea based on inflow x, y coordinates
  //--------------------------------------------------------------------------------------- av.frd.getInflowAreaResrc --
  av.frd.getInflowAreaResrc = function(numTsk, subnum) {
    //console.log('in av.frd.getInflowAreaResrc: numTsk=', numTsk, '; subnum=', subnum);
    var area = 1;
    var corner = '';
    var coordinates = {};
    var labels = ['inflowx1', 'inflowx2', 'inflowy1', 'inflowy2'];
    var len = labels.length;
    if (null != av.nut[numTsk].uiSub.regionNdx[subnum]) {
      if (0 <= av.nut[numTsk].uiSub.regionNdx[subnum] && av.nut[numTsk].uiSub.regionNdx[subnum] < av.sgr.regionQuarterCodes.length) {

        for (var ndx = 0; ndx < len; ndx++) {
          corner = labels[ndx];
          //console.log('corner=', corner, '; av.nut['+numTsk+'].resrc['+corner+']['+subnum+']=', av.nut[numTsk].resrc[corner][subnum]);
          if (NaN == Number(av.nut[numTsk].resrc[corner][subnum])) {
            coordinates[labels[0]] = 0;
          }
          else {
            coordinates[corner] = Number(av.nut[numTsk].resrc[corner][subnum]);
          }
        }
        //console.log('coordinates=',coordinates);
        var subCols = Math.abs( coordinates.inflowx2 - coordinates.inflowx1 ) + 1;
        var subRows = Math.abs( coordinates.inflowy2 - coordinates.inflowy1 ) + 1;
        area = subCols * subRows;
        console.log('numTsk=', numTsk, 'subnum=', subnum, '; cols=', subCols, '; rows=', subRows, '; area=', area);
        return (area);
      }
      else {
        console.log('Error: problem with av.nut['+numTsk+'].uiSub.regionNdx['+subnum+']=', av.nut[numTsk].uiSub.regionNdx[subnum]);
        return (1);
      }
    }
  };
  //----------------------------------------------------------------------------------- end av.frd.getInflowAreaResrc --

  av.frd.findReactOnlyUIdata = function(numTsk, sub) {
    console.log('in av.frd.findReactOnlyUIdata: numTsk=', numTsk, '; sub=', sub);
    if (0 != sub) { console.log('Reaction only Data should position 0 in the array, sub = ', sub); }
    av.nut[numTsk].uiAll.regionsNumOf = 1;         //reaction but no resource so it must be global and none or infinite
    av.nut[numTsk].uiAll.geometry = 'global';
    if (0 < av.nut[numTsk].react.value[sub]) {
      av.nut[numTsk].uiAll.supplyType = 'finite'; 
      //if (av.dbg.flg.nut) { console.log('av.nut['+numTsk+'].uiAll.supplyType =', av.nut[numTsk].uiAll.supplyType); }
    }
    else if (0 > av.nut[numTsk].react.value[sub])  {
      av.nut[numTsk].uiAll.supplyType = 'poison';   //poison or damage. does not kill, but hurts energy aquisition rate (ear). 
    }
    else if (0 == av.nut[numTsk].react.value[sub]) {
      av.nut[numTsk].uiAll.supplyType = 'none';
      //if (av.dbg.flg.nut) { console.log('av.nut['+numTsk+'].uiAll.supplyType =', av.nut[numTsk].uiAll.supplyType); }
    }
    //console.log('numTsk=', numTsk, '; sub=', sub, '; av.nut[numTsk].uiAll.supplyType[sub]=', av.nut[numTsk].uiSub.supplyType[sub]
    //             , '; av.nut[numTsk].uiAll.regionsNumOf=', av.nut[numTsk].uiAll.regionsNumOf);
  };
  
  //---------------------------------------------------------------------------------------- av.frd.resourceNameMatch --
  av.frd.resourceNameMatch = function(numTsk, sub) {
    var matchStatus = 'unknown';
    if ( null == av.nut[numTsk].react.resource[sub] ) {
      matchStatus = 'undefined';
      av.nut[numTsk].react.resource[sub] = 'missing';
    };
    //console.log('av.nut['+numTsk+'].react.resource['+sub+']=', av.nut[numTsk].react.resource[sub]);
    if ( 'missing' === av.nut[numTsk].react.resource[sub] ) {
    matchStatus = 'missing';
  }
  else {
    // There is should be a RESOURCE statement; look for a match
    // make sure react.resource matches resrc.name
    //console.log('av.nut['+numTsk+'].resrc.name=', av.nut[numTsk].resrc.name);
    ndx = av.nut[numTsk].resrc.name.indexOf(av.nut[numTsk].react.resource[sub]);
    //console.log('av.nut['+numTsk+'].react.resource['+sub+']=', av.nut[numTsk].react.resource[sub], '; ndx=', ndx);
    if (0 > ndx) {
      //console.log('resrc.name not found in react.resource = ERROR------------------------ERROR');
      matchStatus = 'not found';
      //return matchStatus;
    } 
    else if (ndx != sub) { 
      console.log('********* Name & resource should have the same index: ',
               'av.nut['+numTsk+'].react.resource['+sub+']=', av.nut[numTsk].react.resource[sub],
               'av.nut['+numTsk+'].resrcName['+ndx+']=', av.nut[numTsk].resrc.name[ndx],
               '************');
      matchStatus = 'index differs';
      return matchStatus;
    } else {
      matchStatus = 'found';
    //return matchStatus;
    }
  };
        return matchStatus;
  };
  //------------------------------------------------------------------------------------ end av.frd.resourceNameMatch --

  //------------------------------------------------------------------------------------------------- av.env.findArea -
  //
  av.env.findArea = function(numTsk, sub) {
    // expects a valid regionCode
    var assumeUIareaValid = false;
    var validUIarea = false;
    var area = 1;
    var isReactName = false;
    var isResrcName = false;
    var isCellName = false;
    var resourceMatch = false;
    var resrcName = '';
    
    // console.log('av.nut['+numTsk+'].uiAll.geometry=', av.nut[numTsk].uiAll.geometry, '- - - - - - - - - - - - - - ');

    // Only process if a REACTION statement exists;
    // console.log('     av.nut['+numTsk+'].react.name['+sub+']=' + av.nut[numTsk].react.name[sub]+'_');
    if (null != av.nut[numTsk].react.name[sub]) {
      // check for a resource in resource
      // console.log('av.nut['+numTsk+'].react.resource.['+sub+']='+ av.nut[numTsk].react.resource[sub]+'_');
      if (null != av.nut[numTsk].react.resource[sub]) {
        // console.log('     av.nut['+numTsk+'].resrc.name['+sub+']='+ av.nut[numTsk].resrc.name[sub]+'_');
        // console.log('(av.nut[numTsk].react.resource[sub] == av.nut[numTsk].resrc.name[sub])='+(av.nut[numTsk].react.resource[sub] == av.nut[numTsk].resrc.name[sub]));
        if (av.nut[numTsk].react.resource[sub] == av.nut[numTsk].resrc.name[sub]) { 
          resourceMatch = true; 
          //console.log('resourceMatch=', resourceMatch);
        }
        else {
          av.nut[numTsk].uiAll.geometry = 'global';
          av.nut[numTsk].uiSub.area[sub] = av.nut.wrldSize;
          area = av.nut.wrldSize;
          // console.log('av.nut['+numTsk+'].uiAll.geometry=', av.nut[numTsk].uiAll.geometry, '________________________');
          
          console.log('Nut: REACTION statement only; area is wrldSize =', av.nut.wrldSize);
          return area;
        }
      };
      if ('global' == av.nut[numTsk].uiAll.geometry) {
        av.nut[numTsk].uiSub.area[sub] = av.nut.wrldSize;
        area = av.nut.wrldSize; 
        console.log('Nut: RESOURCE present; area is wrldSize =', av.nut.wrldSize);
        return area;
      }
      else {
        // geometry type should be grid
        // Test to see if uiSub exits and matches region code uiSub.area if assuming area is already correct
        if (assumeUIareaValid) {  
          // not implementd as I don't expect it to exist
          // verify if uiSub.area exists and is <= wrldSize
          // _return_ av.nut.tsk.uiSub.sub when found and varified. 
          //else validUI is still false and we continue. 
        }; 
        
        //need to define area based on inflow if it exists. 
        //In chemostate, inflow area matches outflow area
        console.log('av.nut['+numTsk+'].uiSub.supplyType['+sub+']=', av.nut[numTsk].uiSub.supplyType[sub]);
        if ('chemostat' == av.nut[numTsk].uiSub.supplyType[sub].toLowerCase()) {
          //console.log('inflowx1', parseInt(av.nut[numTsk].resrc.inflowx1[sub] ) );
          //console.log('inflowx1', parseInt(av.nut[numTsk].resrc.inflowx2[sub] ) );
          //console.log('inflowx1', parseInt(av.nut[numTsk].resrc.inflowy1[sub] ) );
          //console.log('inflowx1', parseInt(av.nut[numTsk].resrc.inflowy2[sub] ) );
          if (av.utl.isNumber(parseInt(av.nut[numTsk].resrc.inflowx1[sub])) && av.utl.isNumber(parseInt(av.nut[numTsk].resrc.inflowx2[sub]))
                && av.utl.isNumber(parseInt(av.nut[numTsk].resrc.inflowy1[sub])) && av.utl.isNumber(parseInt(av.nut[numTsk].resrc.inflowy2[sub])) ) {
            av.nut[numTsk].resrc.boxcol[sub] = Math.abs( 1 + Number(av.nut[numTsk].resrc.inflowx2[sub]) - Number(av.nut[numTsk].resrc.inflowx1[sub]) );
            av.nut[numTsk].resrc.boxrow[sub] = Math.abs( 1 + Number(av.nut[numTsk].resrc.inflowy2[sub]) - Number(av.nut[numTsk].resrc.inflowy1[sub]) );
            av.nut[numTsk].uiSub.area[sub] = av.nut[numTsk].resrc.boxcol[sub] * av.nut[numTsk].resrc.boxrow[sub];
            console.log('Nut: chemostat; use inflow coordinates - av.nut['+numTsk+'].uiSub.area['+sub+'] =', av.nut[numTsk].uiSub.area[sub]);
            return (av.nut[numTsk].uiSub.area[sub]);
          };
        };
        
//        if ('finite')

        // Area from cellbox; supply type is none
        if (av.nut[numTsk].resrc.boxflag[sub]) {
          // check data then assign area based on cellbox rows & cols
          if (av.utl.isNumber(parseInt(av.nut[numTsk].resrc.boxcol[sub])) && av.utl.isNumber(parseInt(av.nut[numTsk].resrc.boxrow[sub]) ) 
              && 0 < (parseInt(av.nut[numTsk].resrc.boxcol[sub])) && (parseInt(av.nut[numTsk].resrc.boxcol[sub])) <= av.nut.wrldSize
              && 0 < (parseInt(av.nut[numTsk].resrc.boxrow[sub])) && (parseInt(av.nut[numTsk].resrc.boxrow[sub])) <= av.nut.wrldSize) {
            av.nut[numTsk].uiSub.area[ndx] = parseInt(av.nut[numTsk].resrc.boxcol[ndx]) * parseInt(av.nut[numTsk].resrc.boxrow[ndx]);
            area = av.nut[numTsk].uiSub.area[ndx];
            console.log('Nut: use cellbox - av.nut['+numTsk+'].uiSub.area['+sub+'] =', av.nut[numTsk].uiSub.area[sub]);
            return area;
          }
        };

        // Area base on wrldSize and region definitons. This will be used in writing environment.cfg
        if ( av.utl.isNumber(parseInt(av.nut[numTsk].uiSub.regionNdx[sub])) ) {
          // sub regiona index exist so use that to fine area from regiona type;
          ndx = parseInt(av.nut[numTsk].uiSub.regionNdx[sub]);
          width = Math.floor( parseInt(av.sgr.regionQuarterCols[ndx]) * parseInt(av.nut.wrldCols) );
          if ( 0 != parseInt(av.nut.wrldCols)%2 ) {
            width += av.sgr.regionQuarterColsAdd;  //odd number of columns add one column to 
          }
          height = Math.floor( parseInt(av.sgr.regionQuarterRows[ndx]) * parseInt(av.nut.wrldRows) );
          if (height < parseInt(av.sgr.regionQuarterRows[ndx]) * parseInt(av.nut.wrldRows)) {
            height += av.sgr.regionQuarterRowsAdd;
          }
          area = width * height;
          return area;
        };
      };    // region is NOT the whole dish; 
    };     // geometry is grid
  };      // there was a react.name 

  
  //--------------------------------------------------------------------------------------------- end av.env.findArea --

  //---------------------------------------------------------------------------------------------- av.frd.resrc2uiSub --
  // Region information was found when RESOURCE line was parced. 
  // Witout a RECOURSE line, geometry = global and region = 1All (or whole dish)
  // called after supply types have been found
  // moves the relevant data from resource and cell to uiSub
  // for now this only works for geometry = grid
  
    av.frd.resrc2uiSub = function() { 
      var supplyType = '';
      var area = parseInt(av.nut.wrldSize);
      var numTsk='', lenNames = 1, sub = 1;
      var nameRCR;     // name should be the same for RESPONSE, CELL, REACTION, but name or reaction matters the least.
      
      var len = av.sgr.logEdNames.length;   //9
      // console.log('av.nut["4oro"].uiAll.geometry=', av.nut["4oro"].uiAll.geometry, '+++++++++++++++++ ');

      //console.log('in av.frd.resrc2uiSub: len=', len);
      for (var ii=0; ii< len; ii++) {
        numTsk = av.sgr.logEdNames[ii];
        lenNames = av.nut[numTsk].resrc.name.length;       // There is data for all reaction statements.
        //console.log('numTsk=', numTsk, '; lenRerc.Names=', lenNames);
        for (var sub=0; sub< lenNames; sub++) {
          if (null != av.nut[numTsk].resrc.name[sub]) {
            nameRCR = av.nut[numTsk].resrc.name[sub];
            area = av.env.findArea(numTsk, sub);
            // console.log('av.nut['+numTsk+'].uiAll.geometry=', av.nut[numTsk].uiAll.geometry, '=================');
            if ('grid' == av.nut[numTsk].uiAll.geometry.toLowerCase()) {
              // move general data from nut.resrc
              // console.log('sub=', sub, '; av.nut['+numTsk+'].uiSub.supplyType=', av.nut[numTsk].uiSub.supplyType);
              supplyType = av.nut[numTsk].uiSub.supplyType[sub].toLowerCase();
              switch (supplyType) {
                case 'finite':
                  if (av.utl.isNumber(parseFloat(av.nut[numTsk].resrc.initial[sub])) && av.utl.isNumber(parseInt(av.nut[numTsk].uiSub.area[sub]))) {
                    av.nut[numTsk].uiSub.initialHiNp[sub] = parseInt(av.nut[numTsk].resrc.initial[sub]) / parseInt(av.nut[numTsk].uiSub.area[sub]);
                  };
                  // if both Cell & RESOURCE initial are defined CELL overwrites RESOURCE in Avida-ED. In avida they are addative;
                  if (av.utl.isNumber(parseFloat(av.nut[numTsk].cell.initial[sub])) ) {
                    av.nut[numTsk].uiSub.initialHiNp[sub] = parseInt(av.nut[numTsk].cell.initial[sub]);
                  };
                  if (av.utl.isNumber(parseFloat(av.nut[numTsk].uiSub.initialHiNp[sub])) ) {
                    av.nut[numTsk].uiSub.initialHiNp[sub] = 0;
                  };
                  break;
                case 'none':
                  av.nut[numTsk].uiSub.initialHiNp[sub] = 0;
                  break;
                case 'chemostat':
                  if (av.utl.isNumber(parseFloat(av.nut[numTsk].resrc.inflow[sub])) && av.utl.isNumber(parseInt(av.nut[numTsk].uiSub.area[sub]))) {
                    av.nut[numTsk].uiSub.inflowHiNp[sub] = parseFloat(av.nut[numTsk].resrc.inflow[sub]) / parseInt(av.nut[numTsk].uiSub.area[sub]);
                  };
                  if (av.utl.isNumber(parseFloat(av.nut[numTsk].uiSub.initialHiNp[sub])) ) {
                    av.nut[numTsk].uiSub.inflowHiNp[sub] = av.utl.isNumber(parseFloat(av.nut[numTsk].uiSub.initialHiNp[sub]));
                  };
                  break;
                  //
              }; // end of switch statement
            };  // end of 'grid' == geometry
          };   // end of checking to make sure name is not null
        };    // end of for subregions loop
      };     // end of task loop
      if (true) { 
        av.nutUI = {};
        av.nutUI = JSON.parse(JSON.stringify(av.nut));
        console.log('end of av.frd.resrc2uiSub');
        console.log('av.nutUI = ', av.nutUI); 
        console.log('========================================================================================== end of av.frd.resrc2uiSub ==');
      }
    };
  //------------------------------------------------------------------------------------------ end av.frd.resrc2uiSub --
  
  //--------------------------------------------------------------------------- av.env.findSupplyType --
  // find some summary info about nutrients. Need to look at each task separately. 
  av.env.findSupplyType = function() {
    var nameMatch;
    var numTsk,lenResourceInReact, sub;
    var nameRCR;     // name should be the same for RESPONSE, CELL, REACTION, but name or reaction matters the least.
    
    var len = av.sgr.logEdNames.length;   //9
    //console.log('in av.env.findSupplyType: len=', len);
    for (var ii=0; ii< len; ii++) {
      numTsk = av.sgr.logEdNames[ii];
      lenResourceInReact = av.nut[numTsk].react.resource.length;       // There is data for all reaction statements. s
      //console.log('numTsk=', numTsk, '; lenRegon=', lenResourceInReact);
      for (var sub=0; sub< lenResourceInReact; sub++) {
        // begin of secton from reAct

        //There are older environment.cfg files that do not include a resource in the reaction statement. 
        // All of those will be considered to have global resources and they will typically be infinite or none.
        // 
        // IF the code word 'missing' is the listed as the name of the resource than there is not resource specified and 
        // the reaction can only act as if the resource for that task is none or infinite and it must be global. 
        if (null != av.nut[numTsk].react.name[sub]) {
          nameRCR = av.nut[numTsk].react.name[sub];

          // returns 'found' if react.resource[sub] matches resrc.react[sub];
          nameMatch = av.frd.resourceNameMatch(numTsk, sub);
          console.log('nameMatch=', nameMatch);
          if ('missing' == nameMatch) { 
            // Avida Avida-ED 3 workspaces do not have Resourc statements;
            // Some Avida-ED 4 workspaces are missing Resource statements;
            av.frd.findReactOnlyUIdata(numTsk, sub); 
          }
          else if ('found' == nameMatch ) { 
            // There is a matching resource statement.
            // Geometry and Region information was found in RESOURCE statment 

            //Find the supply type ------------------------------------------
            //if (av.dbg.flg.nut) { console.log('Nut: regionCode is ', av.nut[numTsk].uiSub.regionCode[sub]); }
            // Look for finite or none
            // Look at RESOURCE initial first. 
            console.log('av.nut['+numTsk+'].resrc.initial['+sub+']=', av.nut[numTsk].resrc.initial[sub]);
            if (null != av.nut[numTsk].resrc.initial[sub]) {
              if (0 == parseFloat(av.nut[numTsk].resrc.initial[sub]) ) {
                av.nut[numTsk].uiSub.supplyType[sub] = 'none';
              } 
              else if (0 < av.nut[numTsk].resrc.initial[sub]) {
                av.nut[numTsk].uiSub.supplyType[sub] = 'finite';
                if (null == av.nut[numTsk].uiSub.area[sub]) {
                  av.nut[numTsk].uiSub.area[sub] = av.nut.wrldSize;   //this may get redifned based on cells
                }
              }
            };
            //If there is also CELL initial, CELL over writes RESOURCE inital for Avida-ED. In avida, they are additive
            console.log('av.nut['+numTsk+'].cell.initial['+sub+']=', av.nut[numTsk].cell.initial[sub]);
            if (null != av.nut[numTsk].cell.initial[sub]) {
              if (0 == parseFloat(av.nut[numTsk].cell.initial[sub]) ) {
                av.nut[numTsk].uiSub.supplyType[sub] = 'none';
              } 
              else if (0 < av.nut[numTsk].cell.initial[sub]) {
                av.nut[numTsk].uiSub.supplyType[sub] = 'finite';
                if (null == av.nut[numTsk].uiSub.area[sub]) {
                  av.nut[numTsk].uiSub.area[sub] = av.nut.wrldSize;   //this may get redifned based on cells
                }
              }
            };
            console.log('av.nut['+numTsk+'].resrc.inflow['+sub+']=', av.nut[numTsk].resrc.inflow[sub]);
            if (av.utl.isNumber(parseFloat(av.nut[numTsk].resrc.inflow[sub])) && av.utl.isNumber(parseFloat(av.nut[numTsk].resrc.outflow[sub])) ) {
              //console.log('av.nut['+numTsk+'].resrc.outflow['+sub+']=', av.nut[numTsk].resrc.outflow[sub]);
              //console.log('0 < parseFloat(av.nut[numTsk].resrc.inflow[sub]) is ', (0 < parseFloat(av.nut[numTsk].resrc.inflow[sub])));
              //console.log('0.0 < ' + parseFloat(av.nut[numTsk].resrc.outflow[sub])+' is ', (0.0 < parseFloat(av.nut[numTsk].resrc.outflow[sub])));
              //console.log('parseFloat(av.nut[numTsk].resrc.outflow[sub]) <= 1 is ', (parseFloat(av.nut[numTsk].resrc.outflow[sub]) <= 1));
              if (0 < parseFloat(av.nut[numTsk].resrc.inflow[sub]) && 
                  0.0 < parseFloat(av.nut[numTsk].resrc.outflow[sub]) && parseFloat(av.nut[numTsk].resrc.outflow[sub]) <= 1) {
                  
                // inflow and outflow exist and are numbers; do the defined areas match?   
                console.log('av.nut['+numTsk+'].resrc.inflowx1['+sub+']=', av.nut[numTsk].resrc.inflowx1[sub]);
                if (av.nut[numTsk].resrc.inflowx1[sub]===av.nut[numTsk].resrc.outflowx1[sub] && av.nut[numTsk].resrc.inflowx2[sub]===av.nut[numTsk].resrc.outflowx2[sub] && 
                    av.nut[numTsk].resrc.inflowy1[sub]===av.nut[numTsk].resrc.outflowy1[sub] && av.nut[numTsk].resrc.inflowy2[sub]===av.nut[numTsk].resrc.outflowy2[sub] ) {
                  console.log('av.nut['+numTsk+'].resrc.outflowx1['+sub+']=', av.nut[numTsk].resrc.outflowx1[sub]);
                  av.nut[numTsk].uiSub.supplyType[sub] = 'chemostat';
                }
                else { 
                  console.log('av.nut['+numTsk+'].resrc.inflowy1['+sub+']=', av.nut[numTsk].resrc.inflowy1[sub]);
                  av.nut[numTsk].uiSub.supplyType[sub] = 'flow';  //not implemented
                };
              };  // end section where inflow and outflow have contains a numbers in the correct range
            }   // end of section where inflow exists and is a number
            
            // is this needed? if needed should there be a test for null and isNaN
            if (0 == av.nut[numTsk].resrc.initial[sub] && 0 == av.nut[numTsk].resrc.inflow[sub]) {
              av.nut[numTsk].uiSub.supplyType[sub] = 'none';
            };
          };  // end of section based on a found resource
          
          // Check some reaction parameters that may effect the supplyType classification
          // a missing depleatable should be set to the avida default, which is one
          if (null == av.nut[numTsk].react.depletable[sub]) { av.nut[numTsk].react.depletable[sub] = 1; }
          // if not value declared; assume Avida-ED defaults for value
          //this could be in react, but I thought of it here. 
          if (null == av.nut[numTsk].react.value[sub]) {
            av.av.nut[numTsk].react.value[sub] = av.sgr.reactValues[ii];
          };
          // Depleatable set to 0 is used to make a resource infinite
          if ( 0 == Number(av.nut[numTsk].react.depletable[sub]) ) {
            //console.log('av.nut['+numTsk+'].react.depletable['+sub+']=', av.nut[numTsk].react.depletable[sub]);
            av.nut[numTsk].uiSub.supplyType[sub] = 'infinite';
          };
        }; // end of loop react name array 
        if (av.sgr.gridOnly && 'global' == av.nut[numTsk].uiAll.geometry) {xr
          av.convertGlobal2grid(numTsk, sub);
        };
      };   //there is a reaction name
    };  // end of logic task loops  
    //if (av.dbg.flg.nut) { 
    if (true) { 
      av.nutSupply = {};
      av.nutSupply = JSON.parse(JSON.stringify(av.nut));
      console.log('end of av.env.findSupplyType');
      console.log('av.nutSupply = ', av.nutSupply); 
      console.log('======================================= end of av.Nut.find Supply Type ===================');
    };

  };
  //--------------------------------------------------------------------------- end av.NutriientCfg2userInterfaceData --
 
  //------------------------------------------------------------------------------------------- av.convertGlobal2grid --
  av.convertGlobal2grid = function(numTsk, sub, nameMatch) {
    var ndx = av.sgr.logicEdnames.indexOf(numTsk);
    var tsk = av.sgr.logicNames[ndx];
    var reactLen = av.sgr.react_argu.length;
    var argue  = '';
    if ('found' != nameMatch) {
      // convert a REACTION only statement to a geometry=grid
      if (0 != sub) { console.log('in av.convertGlobal2grid; REACTION only; sub=', sub); }
      av.nut[numTsk].uiAll.geometry = 'grid';
      for (var ii=0; ii < reactLen; ii++) {
        argue = av.sgr.react_argu[ii];
        av.nut[numTsk].reac[argue][1] = av.nut[numTsk].reac[argue][0];  
      };
      if (0 == av.nut[numTsk].react.value[0]) { 
        av.nut[numTsk].react.depletable[1]=0;
        av.nut[numTsk].resrc.initial[1] = 0;
        av.nut[numTsk].cell.initial[1] = 0;
        av.nut[numTsk].uiSub.initialHiNp[1] = 0;
      } else {
      av.nut[numTsk].resrc.initial[1] = av.nut.wrldSize;
      av.nut[numTsk].cell.initial[1] = av.nut.wrldSize;
      av.nut[numTsk].uiSub.initialHiNp[1] = av.nut.wrldSize;
      }
      av.nut[numTsk].uiSub.area[1] = 'Whole Dish';
      av.nut[numTsk].resrc.name[1] = tsk+'000q';
      av.nut[numTsk].uiSub.regionCode[1] = 'Whole Dish';
      av.nut[numTsk].uiSub.regionNdx1[1] = 0;
      av.nut[numTsk].uiSub.regionSet[1] = 'q';
      av.nut[numTsk].uiSub.initialHiNp[1] = av.nut.wrldSize;
      av.nut[numTsk].uiSub.supplyType[1] = av.nut[numTsk].uiAll.supplyType;
    }
    else {
      // a RESOURCE statement with geometry=global exists
      // not implemented as I don't expect this to exist. 
      // I need to figure out how to get the amount of global resources for this to be useful.
    };
  };
  //--------------------------------------------------------------------------------------- end av.convertGlobal2grid --

  //------------------------------------------------------------------------------------------- av.frd.environment2UI --
  // puts data from the environment.cfg into the structure for the setup form for the population page
  av.frd.environment2UI = function (fileStr, from) {
    'use strict';
    if (av.dbg.flg.nut) { console.log('Nut: ', from, ' called av.frd.environment2UI'); }
    
    if ('test' != av.dnd.configFlag) {
      // using 'normal' activeConfiguration 
      av.fzr.clearEnvironment('av.frd.environment2UI');
      //should the dom be loaded from the clean environment and then load the data from the file? 

      av.nut.wrldCols = av.fzr.actConfig.cols;  //came from  Number(dict.WORLD_X)
      av.nut.wrldRows = av.fzr.actConfig.rows;  //came from  Number(dict.WORLD_Y)
      av.nut.wrldSize = av.fzr.actConfig.cols * av.fzr.actConfig.rows;  //  av.fzr.actConfig.size;

      av.frd.nutrientParse(fileStr, 'av.frd.environment2UI');    // uses av.nut
      av.env.findSupplyType();
      
      // now that region as and supply types have been defined, move relevant data from RESOURCE and CELL to uiSub
      av.frd.resrc2uiSub();  // must be called after SupplyType has been found

      av.frd.defaultNut2dom('av.frd.environment2UI');               //put data from defaults in the dom.
      av.frd.nutrientStruct2dom('av.frd.environment2UI');           //puts data from the structure in the the dom for user interface
    }
    else {
      // using "testConfig"
      var errors =  av.frd.testEnvironmentParse(fileStr, av.frd.environment2struc);    // uses av.fzr.env.react This is in the test tab only and will be removed
      if (1 < errors.length) console.log('errors=', errors);    
    }
    if (av.dbg.flg.nut) { console.log('Nut: ================================================================== end of av.frd.environment2UI =='); }
  };
  //----------------------------------------------------------------------------------- end av.frd.environment2UI --

  //Load defaults in the dom from the defaults in the av.nut structure. 
  //------------------------------------------------------------------------------------------- av.frd.defaultNut2dom --
  av.frd.defaultNut2dom = function(from) {
    var sugarLength = av.sgr.logicNames.length;
    var numTsk, tsk, tskose;
    // only one regioin for now, so this works. I may need add at subcode index later.
    // the data for the regions may not go in the struture in the same order they need to be on the user interface. 

    for (var ii = 0; ii < sugarLength; ii++) {
      numTsk = av.sgr.logEdNames[ii];
      tsk = av.sgr.logicNames[ii];
      tskose = av.sgr.oseNames[ii];

      document.getElementById(tsk+'0geometry').value = av.sgr.nutdft.uiAll.geometry;
      document.getElementById(tsk+'0supplyType').value = av.sgr.nutdft.uiAll.supplyType;
      document.getElementById(tsk+'0regionLayout').value = av.sgr.nutdft.uiAll.regionLayout;
      document.getElementById(tsk+'0initial').value = av.sgr.nutdft.uiAll.initial; 

      //for now only one dish - entire world. Later there will be subdishes initial plan is for 2 and then 4;
      for (subNum = 1; subNum <= av.nut.numRegionsinHTML; subNum++) {
        //console.log('ocument.getElementById('+tsk+subNum+'supplyType) =', document.getElementById(tsk+subNum+'supplyType') );
        document.getElementById(tsk+subNum+'supplyType').value = av.sgr.nutdft.uiSub.supplyType;
        
        //console.log('document.getElementById('+tsk+subNum+'initialHiNp) =', document.getElementById(tsk+subNum+'initialHiNp').value );
        document.getElementById(tsk+subNum+'initialHiNp').value = av.sgr.nutdft.uiSub.initialHi;
        //console.log('document.getElementById('+tsk+subNum+'initialHiNp) =', document.getElementById(tsk+subNum+'initialHiNp').value );
        
        document.getElementById(tsk+subNum+'inflowHiNp').value = av.sgr.nutdft.uiSub.inflowHi;
        document.getElementById(tsk+subNum+'outflowHiNp').value = av.sgr.nutdft.uiSub.outflowHi;
        document.getElementById(tsk+subNum+'diffuseCheck').checked = av.sgr.nutdft.uiSub.diffuseCheck;
        document.getElementById(tsk+subNum+'periodCheck').checked = av.sgr.nutdft.uiSub.periodCheck;
        document.getElementById(tsk+subNum+'gradientCheck').checked = av.sgr.nutdft.uiSub.gradientCheck;
        //console.log('av.dom.'+tsk+subNum+'.diffuseChecked=', document.getElementById(tsk+subNum+'diffuseCheck').checked, 
        //                          '; period=', document.getElementById(tsk+subNum+'periodCheck').checked, 
        //                          '; gradient=',document.getElementById(tsk+subNum+'gradientCheck').checked);
        //console.log('document.getElementById('+tsk+subNum+'hiSide)=', document.getElementById(tsk+subNum+'hiSide') );
        document.getElementById(tsk+subNum+'hiSide').value = av.sgr.nutdft.uiSub.hiSide;
        document.getElementById(tsk+subNum+'inflowLoNp').value = av.sgr.nutdft.uiSub.inflowLo;
        document.getElementById(tsk+subNum+'outflowLoNp').value = av.sgr.nutdft.uiSub.outflowLo;
        document.getElementById(tsk+subNum+'initialLoNp').value = av.sgr.nutdft.uiSub.initialLo;
        document.getElementById(tsk+subNum+'regionName').value = av.sgr.nutdft.uiSub.regionName;
        //
        // Not really in Dom, but needed to transition between environment.cfg to dom back to environment.cfg
        //
        //document.getElementById(tsk+subNum+'regionCode').value = av.sgr.nutdft.uiSub.regionCode;
        //document.getElementById(tsk+subNum+'boxed').value = av.sgr.nutdft.uiSub.boxed;
        //document.getElementById(tsk+subNum+'').value = av.sgr.nutdft.uiSub;    //in case we think of another
      }  // end of subregion list
      //if (av.dbg.flg.nut) { console.log('Nut: ----------------------------------------------------------- end of each task in default to dome =='); }
    };
    // if (av.dbg.flg.nut) { console.log('Nut: ================================================================== end of av.frd.defaultNut2dom =='); }
  };
  //--------------------------------------------------------------------------------------- end av.frd.defaultNut2dom --

  //Now that structure exists, use that data to update values in the user interface. 
  //--------------------------------------------------------------------------------------- av.frd.nutrientStruct2dom --
  av.frd.nutrientStruct2dom = function(from) {
    //console.log(from, 'called av.frd.nutrientStruct2dom --------------------');
    var sugarLength = av.sgr.logicNames.length;  //
    var numTsk, tsk, tskose;
    var subNum = 1;                   //Will need to loop throughh all subNum later
    // only one regioin for now, so this works. I may need add at subcode index later.
    // the data for the regions may not go in the struture in the same order they need to be on the user interface. 
    var xdiffuse = -1;
    var ydiffuse = -1;
    var area = 1;  // area of the world or subsection
    var cols = Number(av.nut.wrldCols);
    var rows = Number(av.nut.wrldRows);
    var wrldSize = cols * rows;
    //if (av.dbg.flg.nut) { console.log('Nut: ', from, ' called av.frd.nutrientStruct2dom: cols = ', cols, '; rows = ', rows, '; wrldSize = ', wrldSize); }
    
    for (var ii = 0; ii < sugarLength; ii++) {
      numTsk = av.sgr.logEdNames[ii];
      tsk = av.sgr.logicNames[ii];
      tskose = av.sgr.oseNames[ii];

      document.getElementById(tsk+'0regionLayout').value = av.nut[numTsk].uiAll.regionLayout;
      //console.log('av.nut['+numTsk+'].uiAll.regionLayout', av.nut[numTsk].uiAll.regionLayout);
      document.getElementById(tsk+'0geometry').value = av.nut[numTsk].uiAll.geometry;

      if ('global' == av.nut[numTsk].uiAll.geometry.toLowerCase() ) {
        document.getElementById(tsk+'0supplyType').value = av.nut[numTsk].uiAll.supplyType;
        //console.log('av.nut['+numTsk+']=', av.nut[numTsk]);
      }
      else if ('grid' == av.nut[numTsk].uiAll.geometry.toLowerCase() ) {
        subsections = av.nut[numTsk].resrc.name.length;
        //console.log('subsections=', subsections,'; av.nut['+numTsk+']=', av.nut[numTsk]);
        
        //Loop through each subsection. 
        for (subNum = 1; subNum < subsections; subNum++) {

          // regionCode will need to be converted to regionName or need to get regionName from xy cooredinates
          //console.log('numTsk=', numTsk, 'av.nut[numTsk].uiSub=', av.nut[numTsk].uiSub);
          //document.getElementById(tsk+subNum+'regionName').value = av.nut[numTsk].uiSub.regionName[subNum];

          //console.log('document.getElementById('+tsk+subNum+'supplyType)',document.getElementById(tsk+subNum+'supplyType') );
          //tmpstr = JSON.stringify(av.nut[numTsk].uiSub.supplyType);
          //console.log('av.nut['+numTsk+'].uiSub.supplyType['+subNum+'] =',av.nut[numTsk].uiSub.supplyType[subNum], '; supplyType=', tmpstr);
          document.getElementById(tsk+subNum+'supplyType').value = av.nut[numTsk].uiSub.supplyType[subNum]; 

          //console.log('numTsk=',numTsk,'; subNum=',subNum,'; resrc.xdiffuse=',av.nut[numTsk].resrc.xdiffuse[subNum], '; resrc.ydiffuse=',av.nut[numTsk].resrc.ydiffuse[subNum]);
          if (av.nut[numTsk].resrc.xdiffuse[subNum]) {
            if (!isNaN(parseFloat(av.nut[numTsk].resrc.xdiffuse[subNum]))) {
              xdiffuse = parseFloat(av.nut[numTsk].resrc.xdiffuse[subNum]);
            }
            else {xdiffuse = 1;}
          } 
          else {xdiffuse = 1;}
          if (av.nut[numTsk].resrc.ydiffuse[subNum]) {
            if (!isNaN(parseFloat(av.nut[numTsk].resrc.ydiffuse[subNum]))) {
              ydiffuse = parseFloat(av.nut[numTsk].resrc.ydiffuse[subNum]);
            }
            else {ydiffuse = 1;}
          }
          else {ydiffuse = 1;}
          diffuse = Math.round((xdiffuse+ydiffuse)/2);
          //console.log(tsk+subNum+'.xdiffuse=', xdiffuse, '; ydiffuse', ydiffuse, '; diffuse=', diffuse);
          if (0 < diffuse) {
            document.getElementById(tsk+subNum+'diffuseCheck').checked = true;
            av.nut[numTsk].uiSub.diffuseCheck[subNum] = true;
          }
          else { 
            document.getElementById(tsk+subNum+'diffuseCheck').checked = false;
            av.nut[numTsk].uiSub.diffuseCheck[subNum] = false;
          }

          //------------------------------------------------------------------------- 
          // Find area of region or whole dish as needed for inflow  Not sure this statement is needed, as there should alway be an area for dish 1.
          if ("1All" == av.nut[numTsk].uiAll.regionLayout) {
            area = wrldSize;
            if (!isNaN(parseFloat(av.nut[numTsk].cell.initial[subNum]))) {
              console.log('av.nut['+numTsk+'].cell.initial['+subNum+']=', parseFloat(av.nut[numTsk].cell.initial[subNum]));
              console.log('av.nut['+numTsk+'].uiSub.initialHiNp['+subNum+']=', av.nut[numTsk].uiSub.initialHiNp[subNum]);
              av.nut[numTsk].uiSub.initialHiNp[subNum] = parseFloat(av.nut[numTsk].cell.initial[subNum])/
                                                         parseFloat(av.nut.wrldSize);
            }
            else if (!isNaN(parseFloat(av.nut[numTsk].resrc.initial[subNum])) ) {
              //console.log('reSrc=', av.nut[numTsk].resrc.initial[subNum], '; wrldSize=', av.nut.wrldSize, 'Num(wrldSize=', parseFloat(av.nut.wrldSize) );
              av.nut[numTsk].uiSub.initialHiNp[subNum] = parseFloat(av.nut[numTsk].resrc.initial[subNum])/
                                                         parseFloat(av.nut.wrldSize);
              //console.log( 'tsk='+numTsk, 'reSrc=' , parseFloat(av.nut[numTsk].resrc.initial[subNum]) );
            }
            if (!isNaN(parseFloat(av.nut[numTsk].uiSub.initialHiNp[subNum]))) {
              //console.log('; uiSub=', av.nut[numTsk].uiSub.initialHiNp[subNum]);
              document.getElementById(tsk+subNum+'initialHiNp').value = av.nut[numTsk].uiSub.initialHiNp[subNum];
            }          
          } 
          else {
            //console.log('numTsk=', numTsk, '; subNum=', subNum, '; cell.initial=', parseFloat(av.nut[numTsk].cell.initial[subNum]), 'reSrc=', av.nut[numTsk].resrc.initial[subNum], '; uiSub=', av.nut[numTsk].uiSub.initialHiNp[subNum]);
            area = av.nut[numTsk].uiSub.area[subNum];
            //console.log('av.nut['+numTsk+'].uiSub.area['+subNum+']=', av.nut[numTsk].uiSub.area[subNum]);
          };

          //------------------------------------------------------------------------- 
          // This only works for whole dish until I start parsing cells. 
          // if initial is defined in RESOURCE, use that value, else use the default value from globals.          
          rValue = parseFloat(av.nut[numTsk].resrc.initial[subNum]);
          var rflag = true;
          //console.log(numTsk+'.resrc.initial=', av.nut[numTsk].resrc.initial[subNum], 'uiSub.initialHi.'+subNum+'=', av.nut[numTsk].uiSubinitialHiNp);
          if ( isNaN(rValue) ) {rflag = false;}
          else {
          // resrc.initial contains a number
            if ( 0 >rValue ) {rflag = false;}
            else {
              // resrc.initial is postive: now test area;
              if ( !isNaN(parseFloat(av.nut[numTsk].uiSub.area[subNum])) && 
                     0 != parseFloat(av.nut[numTsk].uiSub.area[subNum]) ) {
                rValue = rValue / parseFloat(av.nut[numTsk].uiSub.area[subNum]);
              }
              else if ( !isNaN(parseFloat(av.nut.wrldSize)) &&  0 != parseFloat(av.nut.wrldSize) ){
                rValue = rValue / parseFloat(av.nut.wrldSize);
                //console.log('Initial for '+tsk+' subNum='+subNum+'based on WrldSize, subNum size missing or = 0');
              }
            }
          }
          if (!rflag) {
            // inital value not assigned in config file for this task;
            av.nut[numTsk].uiSub.initialHiNp[subNum] = null;
            //if ( isNaN(parseFloat(document.getElementById(tsk+subNum+'initialHiNp').value))) {
            //    document.getElementById(tsk+subNum+'initialHiNp').value = av.sgr.nutdft.uiSub.initialHi;
            //}
          }

          //------------------------------------------------------------------------- 
          // if inflow is defined in RESOURCE, use that value, else use the default value from globals.
          //console.log('av.nut['+numTsk+'].resrc.inflow['+subNum+']=', av.nut[numTsk].resrc.inflow[subNum]);
          rValue = parseFloat(av.nut[numTsk].resrc.inflow[subNum]);
          if ( !isNaN(rValue) ) {
            if ( 0 <= parseFloat(av.nut[numTsk].resrc.inflow[subNum]) ) {
              //dom and nut contain inflow value per cell; 
              //RESOURCE contains inflow amount for all cells defined (whole world or subsection)
              if (0 < area) { rValue = rValue / area; }
              else { console.log('ERROR: area must be greater than zero'); }
            }
            else {
              rValue = av.sgr.nutdft.uiSub.inflowHi;
            }
          }
          else {
              rValue = av.sgr.nutdft.uiSub.inflowHi;           
          };
          //console.log('id=', tsk+subNum+'inflowHiNp');
          document.getElementById(tsk+subNum+'inflowHiNp').value = rValue;
          av.nut[numTsk].uiSub.inflowHiNp[subNum] = rValue;

          //------------------------------------------------------------------------- 
          // if outflow is defined in RESOURCE, use that value, else use the default value from globals.
          rValue = parseFloat(av.nut[numTsk].resrc.outflow[subNum]);
          if ( !isNaN(rValue) ) {
            if ( 0 <= rValue && rValue <= 1 ) {
              //console.log('av.nut['+numTsk+'].uiSub.outflowHiNp['+subNum+']=', tsk+subNum+'outflowHiNp).value=', rValue);
              document.getElementById(tsk+subNum+'outflowHiNp').value = rValue;
              av.nut[numTsk].uiSub.outflowHiNp[subNum] = rValue;
            };
          };
        
          // this is all that is being set now; I'll set more later
        }  //loop thru subsections
      }
      else {
        console.log('Error: geometry unrecognized');
      }
      // must be called outside the subsections loop
      //console.log('av.nut['+numTsk+']', av.nut[numTsk]);
      av.sgr.changeDetailsLayout(tsk, 1, 'av.frd.nutrientStruct2dom');  //the one in this case is for subsection, but it is not used. 
    }
    /*
    var debuglen = av.sgr.logicNames.length;
    for (var ii=0; ii<debuglen;ii++) { 
      tsk = av.sgr.logicNames[ii];
      for (subNum = 1; subNum <= av.nut.numRegionsinHTML; subNum++) {
        console.log('av.dom.'+tsk+subNum+'diffuseChecked=', document.getElementById(tsk+subNum+'diffuseCheck').checked, 
                                  '; period=', document.getElementById(tsk+subNum+'periodCheck').checked, 
                                  '; gradient=',document.getElementById(tsk+subNum+'gradientCheck').checked);
      } 
    }
    */
        //if (av.dbg.flg.nut) { 
    if (av.dbg.flg.nut) { 
      av.nutdom = {};
      av.nutdom = JSON.parse(JSON.stringify(av.nut));
      console.log('end of av.frd.nutrientStruct2dom');
      console.log('av.nutDom = ', av.nutdom); 
    }
    if (av.dbg.flg.nut) { console.log('Nut: ================================================================== end of av.frd.nutrientStruct2dom =='); }
  };
  //----------------------------------------------------------------------------------- end av.frd.nutrientStruct2dom --
  