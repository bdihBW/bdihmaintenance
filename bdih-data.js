// Source: WHOLISTIC MAINTENANCE ANNUALLY CALENDAR FY2026-27 + Four-Quarter Maintenance Plan (Rev 0). Health/sensor figures are illustrative.
(function(){
const R=[
["M-01","AHU","Mechanical","HDMQBA","Energy Centre",5,82,"due","1 Jun 2026","Next service end of July 2026.",0,"In-house","Proactive, Predictive & Preventive"],
["M-02","Atrium Smoke Extract Fan","Mechanical","MQBA","Atrium",5,61,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Reactive"],
["M-03","Axial Fans (New)","Mechanical","HMQBA","Energy Centre",3,68,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Reactive"],
["M-04","Chilled & Hot Water Cassette","Mechanical","MQBA","Bar 1",3,63,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Preventive"],
["M-05","Civil Sump Pump","Mechanical","QBA","Pump House",3,58,"overdue","Jul 2024","Serviced by Mod Control. Intervals influenced by rainfall; visual checks determine need.",5586,"Mod Control","Preventive & Predictive"],
["M-06","Condensate Sump Pump","Mechanical","HQBA","Energy Centre",2,74,"ok","Dec 2025","Maintenance by casual workers. Extended intervals applicable; regular visual inspections.",0,"Casual workers","Preventive & Predictive"],
["M-07","Extract Fans & CO Detector","Mechanical","DMQBA","Basement Parking",4,60,"overdue","No record","No previous maintenance records available.",0,"—","Preventive & Predictive"],
["M-08","Domestic Hot Water Recirculating Pumps","Mechanical","HBA","Bar 3",2,66,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Reactive"],
["M-09","Domestic Booster Pump","Mechanical","HQB","Pump House",4,84,"ok","Nov 2025","Serviced by Climate Control.",25292.04,"Climate Control","Predictive & Reactive"],
["M-10","DX Ceiling Cassette AC Unit","Mechanical","MQBA","Bar 3",2,64,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Preventive"],
["M-11","FCU","Mechanical","MQBA","Bar 1",3,88,"ok","May 2026","Serviced by Climate Control.",8755.20,"Climate Control","Predictive & Preventive"],
["M-12","Fire Pumps","Mechanical","HDWMBA","Pump House",5,57,"overdue","No record","Test runs and daily visual inspections conducted in-house.",0,"In-house","Preventive"],
["M-13","Fire Fighting Equipment","Mechanical","HDWMBA","Site-wide",5,65,"overdue","No record","No previous maintenance records available.",0,"—","Preventive"],
["M-14","Guard House Extract Fans (New)","Mechanical","MQBA","Guard House",1,70,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Preventive"],
["M-15","Janitor Room Extract Fans (New)","Mechanical","MQBA","Bar 3",1,71,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Preventive"],
["M-16","Janitor Sump Pump","Mechanical","MQBA","Bar 1 / Bar 3",3,72,"overdue","Jun 2026","Two Bar 3 pumps replaced by Thembezulu (Jan 2026, P37,900). Two Bar 1 pumps replaced by Mod Control (Jun 2026, P36,936).",74836,"Mod Control / Thembezulu","Predictive & Preventive"],
["M-17","Lift Pit Sump Pump","Mechanical","QBA","Bar 1",3,62,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Preventive"],
["M-18","Pressurization Pump","Mechanical","MBA","Energy Centre",4,64,"overdue","No record","Routine visual inspections carried out in-house.",0,"In-house","Predictive & Reactive"],
["M-19","Primary Pump","Mechanical","HDMBA","Energy Centre",5,63,"overdue","No record","Routine visual inspections carried out in-house.",0,"In-house","Predictive & Reactive"],
["M-20","Secondary Pump","Mechanical","HDMBA","Energy Centre",5,62,"overdue","No record","Routine visual inspections carried out in-house.",0,"In-house","Predictive & Reactive"],
["M-21","Run Around Coil Pump","Mechanical","HDMBA","Bar 1",3,null,"restoration","—","Part of restoration; maintenance scheduled after handover.",0,"—","Predictive & Reactive"],
["M-22","Sololift Toilet Lifting Station Pump","Mechanical","HA","Bar 3",3,41,"critical","No record","3 of 4 on site require replacement; purchase requisition to be submitted.",0,"—","Predictive & Reactive"],
["M-23","Toilet Extract Fans","Mechanical","MQBA","Bar 1 / Bar 3",2,67,"overdue","No record","Routine visual inspections carried out in-house.",0,"In-house","Predictive & Reactive"],
["M-24","Transformer Room Extract Fans","Mechanical","MQBA","Energy Centre",4,66,"overdue","No record","Routine visual inspections carried out in-house.",0,"In-house","Predictive & Reactive"],
["M-25","Gorman Rupp Pumps","Mechanical","HDWMBA","Pump House",5,79,"ok","Jun 2026","Serviced/overhauled by AF Sandilands (Feb 2026, P99,307.68). Control panel upgraded by Miracle Control (Jun 2026, P14,991). Muncher repair by Multiwates ongoing (P7,410).",121708.68,"AF Sandilands","Predictive & Preventive"],
["M-26","Pump Station Backup Generator","Mechanical","HBA","Pump House",5,55,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Preventive"],
["M-27","Chillers","Mechanical","HQBA","Energy Centre",5,38,"critical","Jul 2026","PO issued to Intramech for Chiller 2 repair; scheduling in progress. Jun 2025 repair on Chiller 2 and Chiller 3 compressor assessment.",129442.60,"Intramech","Predictive & Preventive"],
["M-28","Water Treatment System","Mechanical","MQBA","Energy Centre",4,69,"overdue","Mar 2025","Water testing and chemical dosing by AquaPro Water Treatment.",0,"AquaPro","Predictive & Preventive"],
["M-29","Condensing Unit Heat Pump","Mechanical","MQBA","Bar 1",3,76,"ok","Jun 2026","Casual workers Dec 2025. Two Bar 1 pumps replaced by Mod Control Jun 2026.",36936,"Mod Control","Predictive & Preventive"],
["M-30","Sewage Sump Pump","Mechanical","HQA","Pump House",4,60,"overdue","No record","No previous maintenance records available.",0,"—","Preventive"],
["M-31","Diesel Bulk Storage Tank","Mechanical","HD","Energy Centre",4,78,"ok","Daily check","Daily visual checks.",0,"In-house","Preventive"],
["M-32","Cyclone Fans","Mechanical","DMQBA","Energy Centre",2,59,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Reactive"],
["M-33","BMS","Mechanical","DMQBA","Control Room",5,58,"overdue","Aug 2024","Serviced by Atbro Systems.",62791.20,"Atbro Systems","Predictive & Reactive"],
["E-01","RMU","Electrical","HA","Substation",5,60,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Preventive"],
["E-02","Transformer","Electrical","HMQBA","Substation",5,62,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Preventive"],
["E-03","Busbar System","Electrical","MQA","Energy Centre",4,66,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Preventive"],
["E-04","Main LV Switchgear","Electrical","HMQA","Energy Centre",5,64,"overdue","No record","Monthly power-meter reading to be recorded.",0,"—","Predictive & Preventive"],
["E-05","Distribution Boards","Electrical","HMBA","Site-wide",4,67,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Preventive"],
["E-06","UPS","Electrical","HDMQBA","Control Room",5,61,"overdue","27 Feb 2025","Serviced by Algebraic Engineering.",0,"Algebraic Engineering","Predictive & Preventive"],
["E-07","Lighting","Electrical","DMQA","Site-wide",4,47,"critical","Dec 2025","Spot checks and bulb replacement by casual workers. Emergency staircase lights require urgent replacement; one quotation (P328,973.59) received from SE.",0,"Casual workers","Predictive & Preventive"],
["E-08","Wiring Devices","Electrical","MA","Site-wide",2,70,"overdue","No record","No previous maintenance records available.",0,"—","Preventive"],
["E-09","Fire Detection & Voice Evacuation","Electrical","DWQBA","Site-wide",5,52,"overdue","Jul 2024","Serviced by Sharps Electrical (P57,285.23). Next service delayed by Bar 1 restoration works.",57285.23,"Sharps Electrical","Predictive & Preventive"],
["E-10","Earthing & Lightning Protection","Electrical","A","Site-wide",4,65,"overdue","No record","No previous maintenance records available.",0,"—","Predictive & Preventive"],
["E-11","Automatic Standby Diesel Generator","Electrical","HDBA","Energy Centre",5,56,"overdue","4 May 2026","No previous maintenance records; batteries replaced 04 May 2026. Service-hour intervals 250–12,000 h.",0,"In-house","Predictive & Preventive"]
];
const F={H:"Housekeeping",D:"Daily",W:"Weekly",M:"Monthly",Q:"Quarterly",B:"Bi-annual",A:"Annual"};
const assets=R.map(r=>({id:"BDIH-"+r[0],name:r[1],disc:r[2],freq:r[3].split("").map(c=>F[c]),loc:r[4],crit:r[5],health:r[6],status:r[7],last:r[8],note:r[9],spend:r[10],contractor:r[11],strategy:r[12]}));
// FY months (Apr–Mar) and the service interval each month carries in the quarter plan
const months=[["Apr 2026","Monthly"],["May 2026","Monthly"],["Jun 2026","Quarterly"],["Jul 2026","Monthly"],["Aug 2026","Monthly"],["Sep 2026","Bi-annual"],["Oct 2026","Monthly"],["Nov 2026","Monthly"],["Dec 2026","Quarterly"],["Jan 2027","Monthly"],["Feb 2027","Monthly"],["Mar 2027","Annual"]];
const daily=["Automatic Standby Diesel Generator","AHU","Extract fans & CO Detector","Fire pumps","Primary pump","Secondary Pump","Run Around Coil Pump","Sololift Toilet Lifting Station Pump","BMS Monitoring"];
const alt=[["Energy centre housekeeping","UPS","Lighting","Fire Detection & Voice Evacuation"],["Pump house housekeeping","UPS","Lighting","Fire Detection & Voice Evacuation"]];
const monthly=["Fire plant room housekeeping","AHU","BMS","Condensate Sump Pumps","Distribution Boards","Automatic Standby Diesel Generator housekeeping"];
window.BDIH={assets,months,daily,alt,monthly,today:"23 Sep 2026"};
})();
