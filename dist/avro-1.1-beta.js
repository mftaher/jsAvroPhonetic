/*
	=============================================================================
	*****************************************************************************
	The contents of this file are subject to the Mozilla Public License
	Version 1.1 (the "License"); you may not use this file except in
	compliance with the License. You may obtain a copy of the License at
	http://www.mozilla.org/MPL/

	Software distributed under the License is distributed on an "AS IS"
	basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
	License for the specific language governing rights and limitations
	under the License.

	The Original Code is jsAvroPhonetic

	The Initial Developer of the Original Code is
	Rifat Nabi <to.rifat@gmail.com>

	Copyright (C) OmicronLab (http://www.omicronlab.com). All Rights Reserved.


	Contributor(s): ______________________________________.

	*****************************************************************************
	=============================================================================
*/

(function($){

    var methods = {
        init : function(options, callback) {

            var defaults = {'bn': true};
            if(options) {
                $.extend(defaults, options);
            }
            
            var avroCallback = function(e, state) {
                this.cb = callback;
                
                if(e.type === 'switch') {
                    $(this).data('isBangla', !state);
                }
                
                if(typeof this.cb === 'function') {
                    this.cb($(this).data('isBangla'));
                }
            }
            
            return this.each(function() {
                
                if($(this).data('avroEnabled')) {
                    return;
                }
                $(this).data('isBangla', defaults.bn);
                $(this).data('avroEnabled', true);
                
                $(this).bind('keydown.avro', methods.keydown);
                $(this).bind('switch.avro', avroCallback);
                $(this).bind('focus.avro', avroCallback);
                $(this).bind('ready.avro', avroCallback);
                $(this).trigger('ready');
                
            });
            
        },
        destroy : function() {

            return this.each(function() {
                $(this).unbind('.avro');
            })

        },
        keydown : function(e) {
            
            var keycode = e.which;
            if(keycode === 77 && e.ctrlKey && !e.altKey && !e.shiftKey) {
                // http://api.jquery.com/category/events/event-object/
                $(this).trigger('switch', [$(this).data('isBangla')]);
                e.preventDefault();
            }
            
            if(!$(this).data('isBangla')) {
                return;
            }
            
            if(keycode === 32 || keycode === 13 || keycode === 9) {
                methods.replace(this);
            }
            
        },
        replace : function(el) {
            
            var cur = methods.getCaret(el);
            var last = methods.findLast(el, cur);
            var bangla  = OmicronLab.Avro.Phonetic.parse(el.value.substring(last, cur));
            
            if(document.selection) {
                var range = document.selection.createRange();
                range.moveStart('character', -1 * (Math.abs(cur - last)));
                range.text = bangla;
                range.collapse(true);
            }
            else {
            	el.value = el.value.substring(0, last) + bangla + el.value.substring(cur);
                el.selectionStart = el.selectionEnd = (cur - (Math.abs(cur - last) - bangla.length));
            }
            
        },
        findLast : function(el, cur) {
        
        	var last = cur - 1;
        	while(el.value.charAt(last) !== ' ' && last > 0) {
        		last--;
        	}
        	return last;
        	
        },
        // http://stackoverflow.com/questions/263743/how-to-get-cursor-position-in-textarea
        getCaret : function(el) {
            
            if (el.selectionStart) {
                return el.selectionStart;
            } else if (document.selection) {
                el.focus();

                var r = document.selection.createRange();
                if (r == null) {
                    return 0;
                }

                var re = el.createTextRange(),
                rc = re.duplicate();
                re.moveToBookmark(r.getBookmark());
                rc.setEndPoint('EndToStart', re);

                return rc.text.length;
            }
            return 0;
            
        }
    };

    $.fn.avro = function(method) {

        if (methods[method]) {
            return methods[method].apply( this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || ! method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' +  method + ' does not exist on jQuery.avro');
        }
        
    };

})(jQuery);
var OmicronLab = {};
OmicronLab.Avro = {};

OmicronLab.Avro.Phonetic = {
	parse: function(input) {
		var fixed = this.fixString(input);
		var output = "";
		for(var cur = 0; cur < fixed.length; ++cur) {
			var start = cur, end = cur + 1, prev = start - 1;
			var matched = false;
			
			for(var i = 0; i < this.data.patterns.length; ++i) {
				var pattern = this.data.patterns[i];
				end = cur + pattern.find.length;
				if(end <= fixed.length && fixed.substring(start, end) == pattern.find) {
					prev = start - 1;
					if(typeof pattern.rules !== 'undefined') {
					    for(var j = 0; j < pattern.rules.length; ++j) {
    						var rule = pattern.rules[j];
    						var replace = true;
						
    						var chk = 0;
						
    						for(var k=0; k < rule.matches.length; ++k) {
    							var match = rule.matches[k];
							
    							if(match.type === "suffix") {
    								chk = end;
    							} 
    							// Prefix
    							else {
    								chk = prev;
    							}
    							
    							// Handle Negative
    							if(typeof match.negative === 'undefined') {
    							    match.negative = false;
    							    if(match.scope.charAt(0) === '!') {
        							    match.negative = true;
        							    match.scope = match.scope.substring(1);
        							}
    							}
    							
    							// Handle empty value
    							if(typeof match.value === 'undefined') match.value = '';
    							
    							// Beginning
    							if(match.scope === "punctuation") {
    								if(
    									! (
    										((chk < 0) && (match.type === "prefix")) || 
    										((chk >= fixed.length) && (match.type === "suffix")) || 
    										this.isPunctuation(fixed.charAt(chk))
    									) ^ match.negative
    								) {
    									replace = false;
    									break;
    								}
    							}
    							// Vowel
    							else if(match.scope === "vowel") {
    								if(
    									! (
    										(
    											(chk >= 0 && (match.type === "prefix")) || 
    											(chk < fixed.length && (match.type === "suffix"))
    										) && 
    										this.isVowel(fixed.charAt(chk))
    									) ^ match.negative
    								) {
    									replace = false;
    									break;
    								}
    							}
    							// Consonant
    							else if(match.scope === "consonant") {
    								if(
    									! (
    										(
    											(chk >= 0 && (match.type === "prefix")) || 
    											(chk < fixed.length && match.type === ("suffix"))
    										) && 
    										this.isConsonant(fixed.charAt(chk))
    									) ^ match.negative
    								) {
    									replace = false;
    									break;
    								}
    							}
    							// Exact
    							else if(match.scope === "exact") {
    								var s, e;
    								if(match.type === "suffix") {
    									s = end;
    									e = end + match.value.length;
    								} 
    								// Prefix
    								else {
    									s = start - match.value.length;
    									e = start;
    								}
    								if(!this.isExact(match.value, fixed, s, e, match.negative)) {
    									replace = false;
    									break;
    								}
    							}
    						}
						
    						if(replace) {
    							output += rule.replace;
    							cur = end - 1;
    							matched = true;
    							break;
    						}
						
    					}
					}
					if(matched == true) break;
					
					// Default
					output += pattern.replace;
					cur = end - 1;
					matched = true;
					break;
				}
			}
			
			if(!matched) {
				output += fixed.charAt(cur);
			}
		}
		return output;
	},
	fixString: function(input) {
		var fixed = '';
		for(var i=0; i < input.length; ++i) {
			var cChar = input.charAt(i);
			if(this.isCaseSensitive(cChar)) {
				fixed += cChar;
			} else {
				fixed += cChar.toLowerCase();
			}
		}
		return fixed;
	},
	isVowel: function(c) {
		return (this.data.vowel.indexOf(c.toLowerCase()) >= 0);
	},
	isConsonant: function(c) {
		return (this.data.consonant.indexOf(c.toLowerCase()) >= 0);
	},
	isPunctuation: function(c) {
		return (!(this.isVowel(c) || this.isConsonant(c)));
	},
	isExact: function(needle, heystack, start, end, not) {
		return ((start >= 0 && end < heystack.length && (heystack.substring(start, end)  === needle)) ^ not);
	},
	isCaseSensitive: function(c) {
		return (this.data.casesensitive.indexOf(c.toLowerCase()) >= 0);
	},
	data: {
        "patterns":
        [
            {
                "find":"bhl",
                "replace":"ভ্ল"
            },
            {
                "find":"psh",
                "replace":"পশ"
            },
            {
                "find":"bj",
                "replace":"ব্জ"
            },
            {
                "find":"bd",
                "replace":"ব্দ"
            },
            {
                "find":"bb",
                "replace":"ব্ব"
            },
            {
                "find":"bl",
                "replace":"ব্ল"
            },
            {
                "find":"bh",
                "replace":"ভ"
            },
            {
                "find":"vl",
                "replace":"ভ্ল"
            },
            {
                "find":"b",
                "replace":"ব"
            },
            {
                "find":"v",
                "replace":"ভ"
            },
            {
                "find":"cNG",
                "replace":"চ্ঞ"
            },
            {
                "find":"cch",
                "replace":"চ্ছ"
            },
            {
                "find":"cc",
                "replace":"চ্চ"
            },
            {
                "find":"ch",
                "replace":"ছ"
            },
            {
                "find":"c",
                "replace":"চ"
            },
            {
                "find":"dhn",
                "replace":"ধ্ন"
            },
            {
                "find":"dhm",
                "replace":"ধ্ম"
            },
            {
                "find":"dgh",
                "replace":"দ্ঘ"
            },
            {
                "find":"ddh",
                "replace":"দ্ধ"
            },
            {
                "find":"dbh",
                "replace":"দ্ভ"
            },
            {
                "find":"dv",
                "replace":"দ্ভ"
            },
            {
                "find":"dm",
                "replace":"দ্ম"
            },
            {
                "find":"DD",
                "replace":"ড্ড"
            },
            {
                "find":"Dh",
                "replace":"ঢ"
            },
            {
                "find":"dh",
                "replace":"ধ"
            },
            {
                "find":"dg",
                "replace":"দ্গ"
            },
            {
                "find":"dd",
                "replace":"দ্দ"
            },
            {
                "find":"D",
                "replace":"ড"
            },
            {
                "find":"d",
                "replace":"দ"
            },
            {
                "find":"...",
                "replace":"..."
            },
            {
                "find":".`",
                "replace":"."
            },
            {
                "find":"..",
                "replace":"।।"
            },
            {
                "find":".",
                "replace":"।"
            },
            {
                "find":"ghn",
                "replace":"ঘ্ন"
            },
            {
                "find":"Ghn",
                "replace":"ঘ্ন"
            },
            {
                "find":"gdh",
                "replace":"গ্ধ"
            },
            {
                "find":"Gdh",
                "replace":"গ্ধ"
            },
            {
                "find":"gN",
                "replace":"গ্ণ"
            },
            {
                "find":"GN",
                "replace":"গ্ণ"
            },
            {
                "find":"gn",
                "replace":"গ্ন"
            },
            {
                "find":"Gn",
                "replace":"গ্ন"
            },
            {
                "find":"gm",
                "replace":"গ্ম"
            },
            {
                "find":"Gm",
                "replace":"গ্ম"
            },
            {
                "find":"gl",
                "replace":"গ্ল"
            },
            {
                "find":"Gl",
                "replace":"গ্ল"
            },
            {
                "find":"gg",
                "replace":"জ্ঞ"
            },
            {
                "find":"GG",
                "replace":"জ্ঞ"
            },
            {
                "find":"Gg",
                "replace":"জ্ঞ"
            },
            {
                "find":"gG",
                "replace":"জ্ঞ"
            },
            {
                "find":"gh",
                "replace":"ঘ"
            },
            {
                "find":"Gh",
                "replace":"ঘ"
            },
            {
                "find":"g",
                "replace":"গ"
            },
            {
                "find":"G",
                "replace":"গ"
            },
            {
                "find":"hN",
                "replace":"হ্ণ"
            },
            {
                "find":"hn",
                "replace":"হ্ন"
            },
            {
                "find":"hm",
                "replace":"হ্ম"
            },
            {
                "find":"hl",
                "replace":"হ্ল"
            },
            {
                "find":"h",
                "replace":"হ"
            },
            {
                "find":"jjh",
                "replace":"জ্ঝ"
            },
            {
                "find":"jNG",
                "replace":"জ্ঞ"
            },
            {
                "find":"jh",
                "replace":"ঝ"
            },
            {
                "find":"jj",
                "replace":"জ্জ"
            },
            {
                "find":"j",
                "replace":"জ"
            },
            {
                "find":"J",
                "replace":"জ"
            },
            {
                "find":"kkhN",
                "replace":"ক্ষ্ণ"
            },
            {
                "find":"kShN",
                "replace":"ক্ষ্ণ"
            },
            {
                "find":"kkhm",
                "replace":"ক্ষ্ম"
            },
            {
                "find":"kShm",
                "replace":"ক্ষ্ম"
            },
            {
                "find":"kxN",
                "replace":"ক্ষ্ণ"
            },
            {
                "find":"kxm",
                "replace":"ক্ষ্ম"
            },
            {
                "find":"kkh",
                "replace":"ক্ষ"
            },
            {
                "find":"kSh",
                "replace":"ক্ষ"
            },
            {
                "find":"ksh",
                "replace":"কশ"
            },
            {
                "find":"kx",
                "replace":"ক্ষ"
            },
            {
                "find":"kk",
                "replace":"ক্ক"
            },
            {
                "find":"kT",
                "replace":"ক্ট"
            },
            {
                "find":"kt",
                "replace":"ক্ত"
            },
            {
                "find":"kl",
                "replace":"ক্ল"
            },
            {
                "find":"ks",
                "replace":"ক্স"
            },
            {
                "find":"kh",
                "replace":"খ"
            },
            {
                "find":"k",
                "replace":"ক"
            },
            {
                "find":"lbh",
                "replace":"ল্ভ"
            },
            {
                "find":"ldh",
                "replace":"ল্ধ"
            },
            {
                "find":"lkh",
                "replace":"লখ"
            },
            {
                "find":"lgh",
                "replace":"লঘ"
            },
            {
                "find":"lph",
                "replace":"লফ"
            },
            {
                "find":"lk",
                "replace":"ল্ক"
            },
            {
                "find":"lg",
                "replace":"ল্গ"
            },
            {
                "find":"lT",
                "replace":"ল্ট"
            },
            {
                "find":"lD",
                "replace":"ল্ড"
            },
            {
                "find":"lp",
                "replace":"ল্প"
            },
            {
                "find":"lv",
                "replace":"ল্ভ"
            },
            {
                "find":"lm",
                "replace":"ল্ম"
            },
            {
                "find":"ll",
                "replace":"ল্ল"
            },
            {
                "find":"lb",
                "replace":"ল্ব"
            },
            {
                "find":"l",
                "replace":"ল"
            },
            {
                "find":"mth",
                "replace":"ম্থ"
            },
            {
                "find":"mph",
                "replace":"ম্ফ"
            },
            {
                "find":"mbh",
                "replace":"ম্ভ"
            },
            {
                "find":"mpl",
                "replace":"মপ্ল"
            },
            {
                "find":"mn",
                "replace":"ম্ন"
            },
            {
                "find":"mp",
                "replace":"ম্প"
            },
            {
                "find":"mv",
                "replace":"ম্ভ"
            },
            {
                "find":"mm",
                "replace":"ম্ম"
            },
            {
                "find":"ml",
                "replace":"ম্ল"
            },
            {
                "find":"mb",
                "replace":"ম্ব"
            },
            {
                "find":"mf",
                "replace":"ম্ফ"
            },
            {
                "find":"m",
                "replace":"ম"
            },
            {
                "find":"0",
                "replace":"০"
            },
            {
                "find":"1",
                "replace":"১"
            },
            {
                "find":"2",
                "replace":"২"
            },
            {
                "find":"3",
                "replace":"৩"
            },
            {
                "find":"4",
                "replace":"৪"
            },
            {
                "find":"5",
                "replace":"৫"
            },
            {
                "find":"6",
                "replace":"৬"
            },
            {
                "find":"7",
                "replace":"৭"
            },
            {
                "find":"8",
                "replace":"৮"
            },
            {
                "find":"9",
                "replace":"৯"
            },
            {
                "find":"NgkSh",
                "replace":"ঙ্ক্ষ"
            },
            {
                "find":"Ngkkh",
                "replace":"ঙ্ক্ষ"
            },
            {
                "find":"NGch",
                "replace":"ঞ্ছ"
            },
            {
                "find":"Nggh",
                "replace":"ঙ্ঘ"
            },
            {
                "find":"Ngkh",
                "replace":"ঙ্খ"
            },
            {
                "find":"NGjh",
                "replace":"ঞ্ঝ"
            },
            {
                "find":"ngOU",
                "replace":"ঙ্গৌ"
            },
            {
                "find":"ngOI",
                "replace":"ঙ্গৈ"
            },
            {
                "find":"Ngkx",
                "replace":"ঙ্ক্ষ"
            },
            {
                "find":"NGc",
                "replace":"ঞ্চ"
            },
            {
                "find":"nch",
                "replace":"ঞ্ছ"
            },
            {
                "find":"njh",
                "replace":"ঞ্ঝ"
            },
            {
                "find":"ngh",
                "replace":"ঙ্ঘ"
            },
            {
                "find":"Ngk",
                "replace":"ঙ্ক"
            },
            {
                "find":"Ngx",
                "replace":"ঙ্ষ"
            },
            {
                "find":"Ngg",
                "replace":"ঙ্গ"
            },
            {
                "find":"Ngm",
                "replace":"ঙ্ম"
            },
            {
                "find":"NGj",
                "replace":"ঞ্জ"
            },
            {
                "find":"ndh",
                "replace":"ন্ধ"
            },
            {
                "find":"nTh",
                "replace":"ন্ঠ"
            },
            {
                "find":"NTh",
                "replace":"ণ্ঠ"
            },
            {
                "find":"nth",
                "replace":"ন্থ"
            },
            {
                "find":"nkh",
                "replace":"ঙ্খ"
            },
            {
                "find":"ngo",
                "replace":"ঙ্গ"
            },
            {
                "find":"nga",
                "replace":"ঙ্গা"
            },
            {
                "find":"ngi",
                "replace":"ঙ্গি"
            },
            {
                "find":"ngI",
                "replace":"ঙ্গী"
            },
            {
                "find":"ngu",
                "replace":"ঙ্গু"
            },
            {
                "find":"ngU",
                "replace":"ঙ্গূ"
            },
            {
                "find":"nge",
                "replace":"ঙ্গে"
            },
            {
                "find":"ngO",
                "replace":"ঙ্গো"
            },
            {
                "find":"NDh",
                "replace":"ণ্ঢ"
            },
            {
                "find":"nsh",
                "replace":"নশ"
            },
            {
                "find":"Ngr",
                "replace":"ঙর"
            },
            {
                "find":"NGr",
                "replace":"ঞর"
            },
            {
                "find":"ngr",
                "replace":"ংর"
            },
            {
                "find":"nj",
                "replace":"ঞ্জ"
            },
            {
                "find":"Ng",
                "replace":"ঙ"
            },
            {
                "find":"NG",
                "replace":"ঞ"
            },
            {
                "find":"nk",
                "replace":"ঙ্ক"
            },
            {
                "find":"ng",
                "replace":"ং"
            },
            {
                "find":"nn",
                "replace":"ন্ন"
            },
            {
                "find":"NN",
                "replace":"ণ্ণ"
            },
            {
                "find":"Nn",
                "replace":"ণ্ন"
            },
            {
                "find":"nm",
                "replace":"ন্ম"
            },
            {
                "find":"Nm",
                "replace":"ণ্ম"
            },
            {
                "find":"nd",
                "replace":"ন্দ"
            },
            {
                "find":"nT",
                "replace":"ন্ট"
            },
            {
                "find":"NT",
                "replace":"ণ্ট"
            },
            {
                "find":"nD",
                "replace":"ন্ড"
            },
            {
                "find":"ND",
                "replace":"ণ্ড"
            },
            {
                "find":"nt",
                "replace":"ন্ত"
            },
            {
                "find":"ns",
                "replace":"ন্স"
            },
            {
                "find":"nc",
                "replace":"ঞ্চ"
            },
            {
                "find":"n",
                "replace":"ন"
            },
            {
                "find":"N",
                "replace":"ণ"
            },
            {
                "find":"OI`",
                "replace":"ৈ"
            },
            {
                "find":"OU`",
                "replace":"ৌ"
            },
            {
                "find":"O`",
                "replace":"ো"
            },
            {
                "find":"OI",
                "replace":"ৈ",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            }
                        ],
                        "replace":"ঐ"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            }
                        ],
                        "replace":"ঐ"
                    }
                ]
            },
            {
                "find":"OU",
                "replace":"ৌ",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            }
                        ],
                        "replace":"ঔ"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            }
                        ],
                        "replace":"ঔ"
                    }
                ]
            },
            {
                "find":"O",
                "replace":"ো",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            }
                        ],
                        "replace":"ও"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            }
                        ],
                        "replace":"ও"
                    }
                ]
            },
            {
                "find":"phl",
                "replace":"ফ্ল"
            },
            {
                "find":"pT",
                "replace":"প্ট"
            },
            {
                "find":"pt",
                "replace":"প্ত"
            },
            {
                "find":"pn",
                "replace":"প্ন"
            },
            {
                "find":"pp",
                "replace":"প্প"
            },
            {
                "find":"pl",
                "replace":"প্ল"
            },
            {
                "find":"ps",
                "replace":"প্স"
            },
            {
                "find":"ph",
                "replace":"ফ"
            },
            {
                "find":"fl",
                "replace":"ফ্ল"
            },
            {
                "find":"f",
                "replace":"ফ"
            },
            {
                "find":"p",
                "replace":"প"
            },
            {
                "find":"rri`",
                "replace":"ৃ"
            },
            {
                "find":"rri",
                "replace":"ৃ",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            }
                        ],
                        "replace":"ঋ"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            }
                        ],
                        "replace":"ঋ"
                    }
                ]
            },
            {
                "find":"rrZ",
                "replace":"রর‍্য"
            },
            {
                "find":"rry",
                "replace":"রর‍্য"
            },
            {
                "find":"rZ",
                "replace":"র‍্য",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"consonant"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"r"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"y"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"w"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"x"
                            }
                        ],
                        "replace":"্র্য"
                    }
                ]
            },
            {
                "find":"ry",
                "replace":"র‍্য",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"consonant"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"r"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"y"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"w"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"x"
                            }
                        ],
                        "replace":"্র্য"
                    }
                ]
            },
            {
                "find":"rr",
                "replace":"রর",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            },
                            {
                                "type":"suffix",
                                "scope":"!vowel"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"r"
                            },
                            {
                                "type":"suffix",
                                "scope":"!punctuation"
                            }
                        ],
                        "replace":"র্"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"consonant"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"r"
                            }
                        ],
                        "replace":"্রর"
                    }
                ]
            },
            {
                "find":"Rg",
                "replace":"ড়্গ"
            },
            {
                "find":"Rh",
                "replace":"ঢ়"
            },
            {
                "find":"R",
                "replace":"ড়"
            },
            {
                "find":"r",
                "replace":"র",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"consonant"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"r"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"y"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"w"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"x"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"Z"
                            }
                        ],
                        "replace":"্র"
                    }
                ]
            },
            {
                "find":"shch",
                "replace":"শ্ছ"
            },
            {
                "find":"ShTh",
                "replace":"ষ্ঠ"
            },
            {
                "find":"Shph",
                "replace":"ষ্ফ"
            },
            {
                "find":"Sch",
                "replace":"শ্ছ"
            },
            {
                "find":"skl",
                "replace":"স্ক্ল"
            },
            {
                "find":"skh",
                "replace":"স্খ"
            },
            {
                "find":"sth",
                "replace":"স্থ"
            },
            {
                "find":"sph",
                "replace":"স্ফ"
            },
            {
                "find":"shc",
                "replace":"শ্চ"
            },
            {
                "find":"sht",
                "replace":"শ্ত"
            },
            {
                "find":"shn",
                "replace":"শ্ন"
            },
            {
                "find":"shm",
                "replace":"শ্ম"
            },
            {
                "find":"shl",
                "replace":"শ্ল"
            },
            {
                "find":"Shk",
                "replace":"ষ্ক"
            },
            {
                "find":"ShT",
                "replace":"ষ্ট"
            },
            {
                "find":"ShN",
                "replace":"ষ্ণ"
            },
            {
                "find":"Shp",
                "replace":"ষ্প"
            },
            {
                "find":"Shf",
                "replace":"ষ্ফ"
            },
            {
                "find":"Shm",
                "replace":"ষ্ম"
            },
            {
                "find":"spl",
                "replace":"স্প্ল"
            },
            {
                "find":"sk",
                "replace":"স্ক"
            },
            {
                "find":"Sc",
                "replace":"শ্চ"
            },
            {
                "find":"sT",
                "replace":"স্ট"
            },
            {
                "find":"st",
                "replace":"স্ত"
            },
            {
                "find":"sn",
                "replace":"স্ন"
            },
            {
                "find":"sp",
                "replace":"স্প"
            },
            {
                "find":"sf",
                "replace":"স্ফ"
            },
            {
                "find":"sm",
                "replace":"স্ম"
            },
            {
                "find":"sl",
                "replace":"স্ল"
            },
            {
                "find":"sh",
                "replace":"শ"
            },
            {
                "find":"Sc",
                "replace":"শ্চ"
            },
            {
                "find":"St",
                "replace":"শ্ত"
            },
            {
                "find":"Sn",
                "replace":"শ্ন"
            },
            {
                "find":"Sm",
                "replace":"শ্ম"
            },
            {
                "find":"Sl",
                "replace":"শ্ল"
            },
            {
                "find":"Sh",
                "replace":"ষ"
            },
            {
                "find":"s",
                "replace":"স"
            },
            {
                "find":"S",
                "replace":"শ"
            },
            {
                "find":"oo`",
                "replace":"ু"
            },
            {
                "find":"oo",
                "replace":"ু",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"উ"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"উ"
                    }
                ]
            },
            {
                "find":"o`",
                "replace":""
            },
            {
                "find":"oZ",
                "replace":"অ্য"
            },
            {
                "find":"o",
                "replace":"",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"vowel"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"o"
                            }
                        ],
                        "replace":"ও"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"vowel"
                            },
                            {
                                "type":"prefix",
                                "scope":"exact",
                                "value":"o"
                            }
                        ],
                        "replace":"অ"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            }
                        ],
                        "replace":"অ"
                    }
                ]
            },
            {
                "find":"tth",
                "replace":"ত্থ"
            },
            {
                "find":"t``",
                "replace":"ৎ"
            },
            {
                "find":"TT",
                "replace":"ট্ট"
            },
            {
                "find":"Tm",
                "replace":"ট্ম"
            },
            {
                "find":"Th",
                "replace":"ঠ"
            },
            {
                "find":"tn",
                "replace":"ত্ন"
            },
            {
                "find":"tm",
                "replace":"ত্ম"
            },
            {
                "find":"th",
                "replace":"থ"
            },
            {
                "find":"tt",
                "replace":"ত্ত"
            },
            {
                "find":"T",
                "replace":"ট"
            },
            {
                "find":"t",
                "replace":"ত"
            },
            {
                "find":"aZ",
                "replace":"অ্যা"
            },
            {
                "find":"AZ",
                "replace":"অ্যা"
            },
            {
                "find":"a`",
                "replace":"া"
            },
            {
                "find":"A`",
                "replace":"া"
            },
            {
                "find":"a",
                "replace":"া",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"আ"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            },
                            {
                                "type":"prefix",
                                "scope":"!exact",
                                "value":"a"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"য়া"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"exact",
                                "value":"a"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"আ"
                    }
                ]
            },
            {
                "find":"i`",
                "replace":"ি"
            },
            {
                "find":"i",
                "replace":"ি",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"ই"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"ই"
                    }
                ]
            },
            {
                "find":"I`",
                "replace":"ী"
            },
            {
                "find":"I",
                "replace":"ী",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"ঈ"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"ঈ"
                    }
                ]
            },
            {
                "find":"u`",
                "replace":"ু"
            },
            {
                "find":"u",
                "replace":"ু",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"উ"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"উ"
                    }
                ]
            },
            {
                "find":"U`",
                "replace":"ূ"
            },
            {
                "find":"U",
                "replace":"ূ",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"ঊ"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"ঊ"
                    }
                ]
            },
            {
                "find":"ee`",
                "replace":"ী"
            },
            {
                "find":"ee",
                "replace":"ী",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"ঈ"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"ঈ"
                    }
                ]
            },
            {
                "find":"e`",
                "replace":"ে"
            },
            {
                "find":"e",
                "replace":"ে",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"এ"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            },
                            {
                                "type":"suffix",
                                "scope":"!exact",
                                "value":"`"
                            }
                        ],
                        "replace":"এ"
                    }
                ]
            },
            {
                "find":"z",
                "replace":"য"
            },
            {
                "find":"Z",
                "replace":"্য"
            },
            {
                "find":"y",
                "replace":"্য",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"!consonant"
                            },
                            {
                                "type":"prefix",
                                "scope":"!punctuation"
                            }
                        ],
                        "replace":"য়"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            }
                        ],
                        "replace":"ইয়"
                    }
                ]
            },
            {
                "find":"Y",
                "replace":"য়"
            },
            {
                "find":"q",
                "replace":"ক"
            },
            {
                "find":"w",
                "replace":"ও",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            },
                            {
                                "type":"suffix",
                                "scope":"vowel"
                            }
                        ],
                        "replace":"ওয়"
                    },
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"consonant"
                            }
                        ],
                        "replace":"্ব"
                    }
                ]
            },
            {
                "find":"x",
                "replace":"ক্স",
                "rules":
                [
                    {
                        "matches":
                        [
                            {
                                "type":"prefix",
                                "scope":"punctuation"
                            }
                        ],
                        "replace":"এক্স"
                    }
                ]
            },
            {
                "find":":`",
                "replace":":"
            },
            {
                "find":":",
                "replace":"ঃ"
            },
            {
                "find":"^`",
                "replace":"^"
            },
            {
                "find":"^",
                "replace":"ঁ"
            },
            {
                "find":",,",
                "replace":"্‌"
            },
            {
                "find":",",
                "replace":","
            },
            {
                "find":"$",
                "replace":"৳"
            },
            {
                "find":"`",
                "replace":""
            }
        ],
        "vowel":"aeiou",
        "consonant":"bcdfghjklmnpqrstvwxyz",
        "casesensitive":"oiudgjnrstyz"
    }
};
