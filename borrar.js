args = {};

process.argv.forEach(function(elem, ind, arr){
    console.log(ind)
    if(ind > 1){
        var arg = elem.split('=');
        console.log(arg)
        if(arg.length > 0){
            args[arg[0].replace("--", "").replace("-", "")] = arg[1];
        }
    }
});
console.log(args)
process.exit()
