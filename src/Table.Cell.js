maptalks.Table.include(/** @lends maptalks.Table.prototype */{

    createCell: function(content, cellOffset, size, symbol) {
        var textSize = symbol['textSize']||12;
        var textLineSpacing = symbol['textLineSpacing']||8;
        content = this._filterContent(content);
        var options = {
               'symbol': {
                   'markerLineColor': symbol['lineColor']||'#ffffff',
                   'markerLineWidth': 1,
                   'markerLineOpacity': 0.9,
                   'markerLineDasharray': null,
                   'markerFill': symbol['fill']||'#4e98dd',
                   'markerFillOpacity': 0.9,
                   'markerDx': cellOffset['dx']||0,
                   'markerDy': cellOffset['dy']||0,

                   'textFaceName': symbol['textFaceName']||'microsoft yahei',
                   'textSize': textSize,
                   'textFill': symbol['textFill']||'#ff0000',
                   'textOpacity': 1,
                   'textSpacing': 30,
                   'textWrapWidth': size['width'],
                   'textWrapBefore': false,
                   'textLineSpacing': textLineSpacing,
                   'textHorizontalAlignment': 'middle',
                   'textVerticalAlignment': 'middle',
                   'textDx': cellOffset['dx']||0,
                   'textDy': cellOffset['dy']||0
               },
               'boxPadding'   :   {'width' : 15, 'height' : 8},
               'draggable': false,
               'boxAutoSize': false,
               'boxMinWidth': size['width'],
               'boxMinHeight': size['height']
        };
        var coordinate = this.options['position'];
        return new maptalks.TextBox(content, coordinate, options);
    },

    getCellOffset: function(row, col) {
        var dx = 0, dy = 0, 
            currentRowHeight = this._cellWidth/2,
            currentColWidth = this._cellHeight/2;
        if(this._rowHeights[row]) {
          currentRowHeight = this._rowHeights[row]/2;;
        }
        if(this._colWidths[col]) {
          currentColWidth = this._colWidths[col]/2;
        }
        if(this._tableRows) {
            for(var i = 0; i < row; i++) {
                dy += this._rowHeights[i];
            }
            dy += currentRowHeight;
            for(var i = 0; i < col; i++) {
                dx += this._colWidths[i];
            }
            dx += currentColWidth;
        } else {
            dx = this._cellWidth*col + this._cellWidth/2;
            dy = this._cellHeight*row + this._cellHeight/2;
        }
        return  {'dx' : dx, 'dy' : dy};
    },

    getCellSymbol: function(row, col) {
        var defaultSymbol = this.options['symbol'];
        if(this.tableSymbols) {
          var  symbol = this.tableSymbols[row+'_'+col];
          if(symbol) {
            if(!symbol['textLineSpacing']) {
                symbol['textLineSpacing'] = defaultSymbol['textLineSpacing'];
            }
            return symbol;
          }
        }
        return defaultSymbol;
    },

    _addEventsToCell: function(cell) {
      var context = {
        'table' : this,
        'cell'  : cell,
        'row'   : cell._row,
        'col'   : cell._col,
        'dataIndex' : cell.dataIndex
      };
      cell.on('mouseover', this._addMouseoverEvent, context)
          .on('mouseout', this._addMouseoutEvent, context)
          .on('mousedown', this._addMousedownEvent, context)
          .on('click', this._addClickEvent, context)
          .on('dblclick', this._addDBLClickEvent, context)
          .on('contextmenu', this._addContextmenuEvent, context)
          .on('symbolchange', this._cellSymbolChangeEvent, context)
          .on('edittextstart', this._addEditTableEvent, context)
          .on('edittextend', this._cellEditTextEnd, context);
      return cell;
    },

    _cellSymbolChangeEvent: function(event) {
        event['context'] = this;
        var table = this['table'];
        var cell = this['cell'];
        table.fire('symbolchange', event);
        var symbol = this['cell'].getSymbol();
        table.tableSymbols[cell['_row']+'_'+cell['_col']] = table.convertCellToSaveSymbol(symbol);
    },

    _cellEditTextEnd: function(event) {
        event['context'] = this;
        var table = this['table'];
        var cell = this['cell'];
        var rowNum = cell._row;
        var colNum = cell._col;
        var col = table._columns[colNum];
        var dataType = col['dataIndex']
        if(table.options['header']) {
          if(rowNum > 0) {
            rowNum -= 1;
            table._data[rowNum][dataType] = cell.getContent();
          } else {
            table._columns[colNum]['header'] = cell.getContent();
          }
        } else {
          table._data[rowNum][dataType] = cell.getContent();
        }
        this['table'].fire('edittableend', event);
        this['table'].options['editing'] = false;
    },

    convertCellToSaveSymbol: function(symbol) {
        var saveSymbol = {
              fill: symbol['markerFill'],
              lineColor: symbol['markerLineColor'],
              textFaceName: symbol['textFaceName'],
              textFill: symbol['textFill'],
              textSize: symbol['textSize'],
              textWrapWidth: symbol['textWrapWidth']
        };
        return saveSymbol;
    },

    _addEditEventToCell: function(cell) {
        cell.startEditText();
        var textEditor = cell._textEditor;
        textEditor.focus();
        var value = textEditor.value;
        textEditor.value = '';
        if(value!='空') {
            textEditor.value = value;
        }
        var me = this;
        cell.on('remove', function() {
          if(cell.isEditingText()) {
            cell.endEditText();
          }
        });
        cell.on('edittextend', function(){
            var content = cell.getContent();
            var row = cell._row;
            var col = cell._col;
            var colIndex = me._columns[col]['dataIndex'];
            if(this.options['header'] && row >0) {
              me._data[row-1][colIndex] = content;
            } else {
              me._columns[col]['header'] = content;
            }
        });
    },

    _addNumberLabelToGeometry: function(coordinate, cell) {
        //设置label属性
        var cellSymbol = cell.getSymbol();
        var options = {
            'symbol': this._convertCellSymbolToNumberSymbol(cellSymbol),
            'draggable': false,
            'boxAutoSize': false,
            'boxMinWidth': 20,
            'boxMinHeight': 20
        };
        //创建label
        var num = cell.getContent();
        var numberLabel = new maptalks.Label(num, coordinate, options);
        this._layer.addGeometry(numberLabel);
        this._geometryNumLabels.push(numberLabel);
        var me = this;
        cell.on('remove', function(){
            me._removeNumLabel(numberLabel);
            numberLabel.remove();
        }, this);
        cell.on('hide', function() {
          numberLabel.hide();
        }, this);
        cell.on('show', function() {
          numberLabel.show();
        }, this);
        var me = this;
        cell.on('contentchange', function() {
          var start = 0;
          if(me.options['header']) {
              start = -1;
          }
          var row = cell._row + start;
          var item = me._data[row];
          var _coordiante = item.coordinate;
          if(_coordiante) numberLabel.setCoordinates(new maptalks.Coordinate(_coordiante.x, _coordiante.y));
        }, this);
        var me = this;
        cell.on('symbolchange', function(){
            var symbol = me._convertCellSymbolToNumberSymbol(cell.getSymbol());
            me._changeNumLabelSymbol(numberLabel, symbol);
            numberLabel.setSymbol(symbol);
        },this);
        cell.on('contentchange positionchanged', function(){
            var number = cell.getContent();
            me._changeNumLabelContent(numberLabel, number);
            numberLabel.setContent(number);
        },this);
    },

    _hideNumLabel: function () {
      for (var i = 0; i < this._geometryNumLabels.length; i++) {
        this._geometryNumLabels[i].hide();
      }
    },

    _showNumLabel: function () {
      for (var i = 0; i < this._geometryNumLabels.length; i++) {
        this._geometryNumLabels[i].show();
      }
    },

    _removeNumLabel: function(label) {
      for (var i = 0; i < this._geometryNumLabels.length; i++) {
        if(label ===  this._geometryNumLabels[i]) {
          this._geometryNumLabels.splice(i, 1);
          break;
        }
      }
    },

    _changeNumLabelSymbol: function(label, symbol) {
      for (var i = 0; i < this._geometryNumLabels.length; i++) {
        if(label ===  this._geometryNumLabels[i]) {
          this._geometryNumLabels[i].setSymbol(symbol);
          break;
        }
      }
    },

    _changeNumLabelContent: function(label, content) {
        for (var i = 0; i < this._geometryNumLabels.length; i++) {
          if(label ===  this._geometryNumLabels[i]) {
            this._geometryNumLabels[i].setContent(content);
            break;
          }
        }
    },

    _convertCellSymbolToNumberSymbol: function(cellSymbol){
        var symbol = {
            'markerType' : 'ellipse',
            'markerLineColor': '#ffffff',//cellSymbol['markerLineColor']||'#ffffff',
            'markerLineWidth': 0,//cellSymbol['markerLineWidth']||1,
            'markerLineOpacity': cellSymbol['markerLineOpacity']||0,
            'markerFill': cellSymbol['markerFill']||'#4e98dd',
            'markerFillOpacity': cellSymbol['markerFillOpacity']||1,
            'markerDx': 0,
            'markerDy': 0,
            'markerHeight' : 30,
            'markerWidth': 30,

            'textFaceName': cellSymbol['textFaceName']||'microsoft yahei',
            'textSize': cellSymbol['textSize']||12,
            'textFill': cellSymbol['textFill']||'#ff0000',
            'textOpacity': cellSymbol['textOpacity']||1,
            'textSpacing': cellSymbol['textSpacing']||0,
            'textWrapBefore': false,
            'textLineSpacing': cellSymbol['textLineSpacing']||0,
            'textHorizontalAlignment': cellSymbol['textHorizontalAlignment']||'middle',
            'textVerticalAlignment': cellSymbol['textVerticalAlignment']||'middle',
            'textDx': 0,
            'textDy': 0
        };
        return symbol;
    },

    _filterContent: function (content) {
        content = content+"";
        var result = content.replace(/\r/ig, "").replace(/\v/ig, "").replace(/\f/ig, "").replace(/\t/ig, "").replace(/\b/ig, "")
                 .replace(/\n\n/ig, "\n");
        return result;
    },

    isNumber:function (val) {
        return (typeof val === 'number') && !isNaN(val);
    }

});