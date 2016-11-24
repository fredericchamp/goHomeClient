const cReadRefList     =   1;
const cReadUsers       =  10;
const cReadCurrentUser =  11;
const cReadActors      =  20;
const cReadImgSensor   =  30;
const cReadSensor      =  40;
const cReadSensorVal   =  41;
const cReadSensorAct   =  50;
const cTriggerActor    = 100;
const cSaveObject      = 200;

const DBTypeNone       = 0;
const DBTypeBool       = 1;
const DBTypeInt        = 2;
const DBTypeFloat      = 3;
const DBTypeText       = 4;
const DBTypeDateTime   = 5;
const DBTypeURL        = 6;


var gStartup            = { startup:true, loadAsk:0, loadGot:0 } ;

var vm = {};

function htmlEncode(str) {
    var result = "";
    var str = (arguments.length===1) ? str : this;
    for(var i=0; i<str.length; i++) {
        var chrcode = str.charCodeAt(i);
        result+=(chrcode>128) ? "&#"+chrcode+";" : str.substr(i,1)
    }
    return result;
}

// -----------------------------------------------------------------------------------------------------------------------------------------

function refListFromNames( listName, objList ) {
    var refList = new Array();
    var nameIdx = 0
    for (i = 0; i < objList[0].Fields.length; i++) {
        if ( objList[0].Fields[i].Name == 'Name' ) {
            nameIdx = i; // TODO should use IdField rather than index
            break;
        }
    }
    for (i = 0; i < objList.length; i++) {
        refList.push( {Name: listName, Code:objList[i].Values[0].IdObject, Label:objList[i].Values[nameIdx].Val} );
    }
    return refList;
}

// -----------------------------------------------------------------------------------------------------------------------------------------

function getObjById(obj,id){
    for (i = 0; i < obj.length; i++) {
        if (obj[i].Values[0].IdObject == id) {
            return obj[i];
        }
    }
    return {Fiels:[], Values:[]};
}

function getObjVal(obj,key){
    if ( obj == null ) return '';
    var fieldId=0;
    for (i = 0; i < obj.Fields.length; i++) {
        if (obj.Fields[i].Name == key) {
            fieldId = obj.Fields[i].IdField;
            break;
        }
    }
    if ( fieldId==0 ) {
        return '';
    }
    for (i = 0; i < obj.Values.length; i++) {
        if (obj.Values[i].IdField == fieldId) {
            return obj.Values[i].Val;
        }
    }
    return '';
}

// -----------------------------------------------------------------------------------------------------------------------------------------

function callServer(action,cmde){
    if ( gStartup.startup ) {
        gStartup.loadAsk++;
    }
    $.post("/api", { command:$.toJSON(cmde) }, function(data, status){
        switch (action) {
        case cReadRefList:
            // TODO check if data != '{"error":"....."}'
            if ( vm.refList == null ) {
                vm.refList = new Object();
            }
            var lstAll = $.parseJSON(data);
            var curName = lstAll[0].Name;
            var oneList = new Array();
            for ( i = 0; i < lstAll.length; i++) {
                if ( curName == lstAll[i].Name ) {
                    oneList.push(lstAll[i]);
                } else {
                    vm.refList[curName] = oneList;
                    curName = lstAll[i].Name
                    oneList = new Array();
                    oneList.push(lstAll[i]);
                }
            }
            vm.refList[curName] = oneList;
            break;
        case cReadUsers:
            // TODO check if data != '{"error":"....."}'
            vm.userList = $.parseJSON(data);
            break;
        case cReadCurrentUser:
            // TODO check if data != '{"error":"....."}'
            vm.currentUser = $.parseJSON(data);
            break;
        case cReadActors:
            // TODO check if data != '{"error":"....."}'
            vm.actorList = $.parseJSON(data);
            if ( vm.refList == null ) {
                vm.refList = new Object();
            }
            vm.refList['ActorList'] = refListFromNames('ActorList', vm.actorList);
            break;
        case cReadImgSensor:
            // TODO check if data != '{"error":"....."}'
            vm.imgSensorList = $.parseJSON(data);
            break;
        case cReadSensor:
            // TODO check if data != '{"error":"....."}'
            vm.sensorList = $.parseJSON(data);
            for (i = 0; i < vm.sensorList.length; i++) {
                vm.sensorList[i].Ts='';
                vm.sensorList[i].Val='';
            }
            if ( vm.refList == null ) {
                vm.refList = new Object();
            }
            vm.refList['SensorList'] = refListFromNames('SensorList', vm.sensorList);
            break;
        case cReadSensorVal:
            // TODO check if data != '{"error":"....."}'
            var sensorVal = $.parseJSON(data);
            var sensor = getObjById(vm.sensorList,cmde.objectid);
            sensor.Ts = sensorVal.Ts;
            sensor.Val = sensorVal.Val;
            if (vm.initLoadDone) vm.$forceUpdate();
            break;
        case cReadSensorAct:
            // TODO check if data != '{"error":"....."}'
            vm.sensorActList = $.parseJSON(data);
            break;
        case cSaveObject:
            // TODO check if data != '{"error":"....."}'
            // TODO if save fail, read original values from serveur and update corresponding vm.xxxxList to restore valid values
            break;
        case cTriggerActor:
            // TODO check if data != '{"error":"....."}'
            vm.showMessage(cmde.command + '(' + data + ')' ,'alert-success',1500);
            break;
        default:
            vm.showMessage('callServer : action inconnue (' + action + ')', 'alert-danger',3000);
            break;
        }
        gStartup.loadGot++;
        if (gStartup.startup==false && gStartup.loadAsk <= gStartup.loadGot) {
            vm.initLoadDone=true;
        }
    });
}

// -----------------------------------------------------------------------------------------------------------------------------------------

$(document).ready(function(){



    Vue.component('goh-message', {
        props: ['gohmsg'],
        template: '<div :class="msgclass" @click="closemsg">{{ this.gohmsg.message }}</div>',
        computed: {
            msgclass:function () { return "alert " + this.gohmsg.msgtype + " goh-msg"; }
        },
        methods: {
            closemsg: function () { this.gohmsg.message=''; }
        }
    });




    Vue.component('goh-header', {
        props: ['user'],
        template: '<div class="mainheader" @click="reload" >{{headertext}}</div>',
        computed: {
            headertext:function () {
                return "Welcome " + getObjVal(this.user,"FirstName") + ' (' + getObjVal(this.user,"Email") + ')';
            }
        },
        methods: {
            reload: function () { window.location.reload(true); }
        }
    });





    Vue.component('goh-actors', {
        props: {
            actor:null,
            inputparam:''
        },
        template: ' <span>\
                        <button type="button" class="btn btn-link" style="background:none; width:100px; color:black;" data-toggle="modal" :data-target="modalref">\
                        {{name}}<br><img class="icone" :src="icone"></img></button>\
                        <div :id="modalid" class="modal fade" role="dialog"><div class="modal-dialog"><div class="modal-content">\
                            <div class="modal-header"><h4 class="modal-title">Confirmation</h4></div>\
                            <div class="modal-body">Actionner {{name}}\
                                <span v-if="modalinput"><input type="text" class="form-control" v-model="inputparam"></span>\
                            </div>\
                            <div class="modal-footer">\
                                <button type="button" class="btn btn-default" data-dismiss="modal" @click="actionner">OK</button>\
                                <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>\
                        </div></div></div></div>\
                    </span>',
        computed: {
            id:function () { return this.actor.Values[0].IdObject; },
            name:function () { return getObjVal(this.actor,"Name"); },
            icone:function () { return getObjVal(this.actor,"ImgFileName"); },
            modalid:function () { return "modal_" + this.id ; },
            modalref:function () { return "#" + this.modalid ; },
            modalinput:function () { return getObjVal(this.actor,"DynParamType") != '0'; }
        },
        methods: {
            actionner: function (event) {
                callServer(cTriggerActor,{ command:'TriggerActor', itemtypeid:0, itemid:0, objectid:this.id, startts:0, endts:0, jsonparam:this.inputparam });
            }
        }
    });




    Vue.component('goh-isensor', {
        props: ['imgsensor'],
        template: ' <span>\
                        <button type="button" class="btn btn-link" style="background:none; width:100px; color:black;" @click="readImg">\
                        {{name}}<br><img class="icone" :src="icone"></img></button>\
                    </span>',
        computed: {
            name:function () { return getObjVal(this.imgsensor,"Name"); },
            icone:function () { return getObjVal(this.imgsensor,"ImgFileName"); }
        },
        methods: {
            readImg: function (event) {
                vm.imgSensorSrc = '/images/PlageMoorea2.jpg';
                var url=getObjVal(this.imgsensor,'Param');
                if ( url == '' ) {
                    vm.showMessage('URL invalide pour Image sensor ' + this.name, 'alert-danger',3000);
                    vm.imgSensorSrc = '';
                } else {
                    // For some raison (?) with setTimeout we avoid image caching
                    setTimeout(function() { vm.imgSensorSrc = url; vm.$forceUpdate(); }, 100);
                    vm.imgSensorSrc = url;  // TODO sometime the img is not upload/diplay
                }
            }
        }
    });




    Vue.component('goh-isensor-show', {
        props: ['imgsensorsrc'],
        template: ' <div class="imgsensor" @click="hideImg">\
                        <img :src="imgsensorsrc" class="imgsensor img-thumbnail"/>\
                        <div class="imgsensortitle"> {{imgsensorsrc}} </div>\
                    </div>',
        methods: {
            hideImg: function (event) { vm.imgSensorSrc = '';  }
            // TODO : add button to Save img
        }
    });





    Vue.component('goh-sensors-row', {
        props: {
            sensor:null,
            readvalue: '',
            readdate: ''
        },
        template: ' <tr @click="updateval">\
                    <td>{{id}}</td><td>{{name}}</td><td>{{readvalue}}</td><td>{{showdate}}</td>\
                    </tr>',
        computed: {
            id:function () { return this.sensor.Values[0].IdObject; },
            name:function () { return getObjVal(this.sensor,"Name"); },
            showdate:function () {
                if (this.readdate == 0) {
                    this.updateval();
                    return '/';
                }
                var now = new Date();
                var dt = new Date(this.readdate);
                if ( dt.getDate() != now.getDate() )
                    return dt.getFullYear() + '-' + dt.getMonth() + '-' + dt.getDate();
                return ('0'+dt.getHours()).slice(-2) + ':' + ('0'+dt.getMinutes()).slice(-2) + ':' + ('0'+dt.getSeconds()).slice(-2);
            }
        },
        methods: {
            updateval: function () {
                callServer(cReadSensorVal,{command:'ReadSensor', itemtypeid:0, itemid:0, objectid:this.id, startts:0, endts:0, jsonparam:''});
            }
        }
    });



    Vue.component('goh-obj-edit-field', {
        props: {
            field:null,
            vals:null
        },
        template: ' <div :id="\'div_\'+field.Name" class="form-group has-feedback">\
                        <label class="col-sm-2 control-label" :for="field.Name"> {{field.Label}} </label>\
                        <div class="col-sm-10">\
                            <span v-if="(htmlfieldtype(field)==\'input\')">\
                                <input v-model="vals[field.Name]" :type="getinputtype(field)" :id="field.Name" :placeholder="field.Helper" \
                                @input="checkinput(field,$event.target.value)" class="form-control input-sm">\
                                <span :id="\'ico_\'+field.Name" class="glyphicon form-control-feedback"></span>\
                            </span>\
                            <span v-if="(htmlfieldtype(field)==\'select\')">\
                                <select v-model="vals[field.Name]" :id="field.Name" :placeholder="field.Helper" class="form-control">\
                                    <option v-for="oneVal in vm.refList[field.RefList]" :value="oneVal.Code" >{{oneVal.Label}}</option>\
                                </select>\
                            </span>\
                        </div>\
                    </div>',
        mounted: function () {
            this.checkinput(this.field,this.vals[this.field.Name]);
        },
        methods: {
            checkinput: function (field,curVal) {
                if ( field.Required  != '0' && curVal == '' ) {
                    $("#div_"+field.Name).attr("class", 'form-group has-feedback has-error');
                    $("#ico_"+field.Name).attr("class", 'glyphicon form-control-feedback glyphicon-remove');
                    return false;
                }
                if ( field.Regexp != '' ) {
                    var pattern = new RegExp(vm.refList[field.Regexp][0].Label,"g");
                    if ( !pattern.test(curVal) ) {
                        $("#div_"+field.Name).attr("class", 'form-group has-feedback has-error');
                        $("#ico_"+field.Name).attr("class", 'glyphicon form-control-feedback glyphicon-remove');
                        return false;
                    }
                }
                if ( field.UniqKey != '0' ) {
                    if ( curVal == '' ) {
                        $("#div_"+field.Name).attr("class", 'form-group has-feedback has-error');
                        $("#ico_"+field.Name).attr("class", 'glyphicon form-control-feedback glyphicon-remove');
                        return false;
                    } else {
                        // TODO check uniqueness of curVal within all field.Name values for same field.IdItem and <> IdObject
                    }
                }
                $("#div_"+field.Name).attr("class", 'form-group has-feedback has-success');
                $("#ico_"+field.Name).attr("class", 'glyphicon form-control-feedback glyphicon-ok');
                return true;
            },
            htmlfieldtype: function (field) {
                switch (field.IdDataType){
                case DBTypeInt:
                    if ( field.RefList=='' ) return 'input';
                    return 'select';
                case DBTypeFloat:
                case DBTypeText:
                    return 'input';
                default :
                    return '';
                }
            },
            getinputtype: function (field) {
                switch (field.IdDataType) {
                case DBTypeInt:
                case DBTypeFloat:
                    return 'number';
                default:
                    switch (field.Regexp) {
                    case 'email':
                    case 'tel':
                    case 'password':
                        return field.Regexp;
                    default:
                        return 'text';
                    }
                }
            }
        }
    });



    Vue.component('goh-admin-obj', {
        props: {
            showmodalform:false,
            editobj:null,
            modaltitle: '',
            homeobj:null
        },
        template: ' <li class="list-group-item">\
                        <div @click="showmodalform=true;"> {{name}} </div>\
                        <div class="gray-out-page" v-if="showmodalform==true"><div class="form-panel">\
                            <div class="panel panel-default">\
                                <div class="panel-heading">{{modaltitle}}</div>\
                                <div class="panel-body">\
                                    <form class="form-horizontal"><span v-for="(field, idx) in homeobj.Fields"  style="font-size: 0.7em;">\
                                        <goh-obj-edit-field :field="field" :vals="getEditobj"></goh-obj-edit-field>\
                                    </span></form>\
                                </div>\
                                <div class="panel-footer">\
                                    <button type="button" class="btn btn-default" @click="this.saveObj">Save</button>\
                                    <button type="button" class="btn btn-default" @click="this.cancelEdit">Cancel</button>\
                                </div>\
                            </div>\
                        </div></div>\
                    </li>',
        computed: {
            name:function () {
                var name = getObjVal(this.homeobj,"Name");
                if ( name == '' && getObjVal(this.homeobj,"FirstName") != '' ) {
                    name = getObjVal(this.homeobj,"FirstName") + ' ' + getObjVal(this.homeobj,"LastName") + ' (' + getObjVal(this.homeobj,"Email") + ')';
                }
                if ( name == '' && getObjVal(this.homeobj,"idMasterObj") != '' ) {
                    name = getObjVal(getObjById(vm.sensorList,getObjVal(this.homeobj,"idMasterObj")),"Name") + " to " +
                        getObjVal(getObjById(vm.actorList,getObjVal(this.homeobj,"idActor")),"Name") + " on '" +
                        htmlEncode(getObjVal(this.homeobj,"Condition")) + "'";
                }
                if ( name == '' ) {
                    name = 'Object_' + this.homeobj.Values[0].IdObject ;
                }
                return name;
            },
            getEditobj:function () {
                if ( this.editobj == null ) {
                    var obj = new Object;
                    for ( idx = 0; idx < this.homeobj.Fields.length; idx++ ) {
                        obj[this.homeobj.Fields[idx].Name] = this.homeobj.Values[idx].Val;
                    }
                    obj.IdObject = this.homeobj.Values[0].IdObject;
                    this.editobj = obj;
                }
                return this.editobj;
            }
        },
        methods: {
            cancelEdit: function() {
                this.editobj = null;
				this.showmodalform=false;
            },
            saveObj: function() {
                // TODO if form validation OK
                for ( idx = 0; idx < this.homeobj.Fields.length; idx++ ) {
                    this.homeobj.Values[idx].Val = this.editobj[this.homeobj.Fields[idx].Name]
                }
                // SaveObject
                callServer(cSaveObject,{ command:'SaveObject', itemtypeid:0, itemid:0, objectid:0, startts:0, endts:0,
                    jsonparam: $.toJSON(this.homeobj) });
				this.showmodalform=false;
            }
        }
    });


// -----------------------------------------------------------------------------------------------------------------------------------------


    // Read Reference lists
    callServer(cReadRefList,{ command:'ReadRefList', itemtypeid:0, itemid:0, objectid:0, startts:0, endts:0, jsonparam:'%' });
    // Read current user
    callServer(cReadCurrentUser,{ command:'ReadCurrentUser', itemtypeid:0, itemid:0, objectid:0, startts:0, endts:0, jsonparam:'' });
    // Read actors
    callServer(cReadActors,{ command:'ReadObject', itemtypeid:3, itemid:0, objectid:0, startts:0, endts:0, jsonparam:'' });
    // Read img sensors
    callServer(cReadImgSensor,{ command:'ReadObject', itemtypeid:5, itemid:0, objectid:0, startts:0, endts:0, jsonparam:'' });

    gStartup.startup = false;

    // Read users
    callServer(cReadUsers,{ command:'ReadObject', itemtypeid:1, itemid:0, objectid:0, startts:0, endts:0, jsonparam:'' });
    // Read sensors
    callServer(cReadSensor,{ command:'ReadObject', itemtypeid:2, itemid:0, objectid:0, startts:0, endts:0, jsonparam:'' });
    // Read sensorAct i.e. actors trigger by sensor reading
    callServer(cReadSensorAct,{ command:'ReadObject', itemtypeid:4, itemid:0, objectid:0, startts:0, endts:0, jsonparam:'' });


// -----------------------------------------------------------------------------------------------------------------------------------------


    vm = new Vue({
        el: '#gohome',
        data: {
            initLoadDone: false,
            refList: null,
            currentUser: null,
            userList: null,
            actorList: null,
            sensorList: null,
            sensorActList : null,
            imgSensorList: null,
            imgSensorSrc: '',
            gohMsg:{msgtype:'alert-success',message:''}
        },
        methods: {
            showMessage: function(message,msgtype,delay){
                if (msgtype!=null && msgtype.length >0) {
                    this.gohMsg.msgtype = msgtype;
                } else {
                    this.gohMsg.msgtype = 'alert-info';
                }
                if (delay!=null && delay >0) {
                    setTimeout(function() { this.gohMsg.message=''; }, delay);
                }
                this.gohMsg.message = message;
            }
        },
        watch: {
            imgSensorList: function(val) { ; } //alert('imgSensorList'); }
        }
    });

});


