function triggerTimedEvents(blocksToTrigger) {
    var requiredTimers = new Array();
    
    $.each(blocksToTrigger, function(index, block) { 
        if(blockRegister[block].hasOwnProperty("timedEvents")) {
            $.each(blockRegister[block]["timedEvents"], function(index, timedEvent) {
                requiredTimers.push(timedEvent);
            });
        }
    });
    
    //Clear all timers except requiredTimers
    for(timers in updateTimers) {
        if($.inArray(timers, requiredTimers) == -1) {
            window.clearInterval(updateTimers[timers]);
            delete updateTimers[timers];
        }
    }

    $.each(requiredTimers, function(index, timer) {
        if(!updateTimers.hasOwnProperty(timer)) {
            updateTimers[timer]=setInterval(function(){
                triggerTimedEvent(timer);
            },610000);
        }
    });

}

function triggerTimedEvent(functionName) {
    eval(functionName+"()");
}
