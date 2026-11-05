const irregular: ReadonlyMap<string, ReadonlyArray<string>> = new Map([
  ["arised", ["arose", "arisen"]], ["beated", ["beat", "beaten"]], ["becomed", ["became", "become"]], ["begined", ["began", "begun"]],
  ["bited", ["bit", "bitten"]], ["blowed", ["blew", "blown"]], ["breaked", ["broke", "broken"]], ["bringed", ["brought"]],
  ["builded", ["built"]], ["buyed", ["bought"]], ["catched", ["caught"]], ["choosed", ["chose", "chosen"]], ["comed", ["came"]],
  ["costed", ["cost"]], ["cutted", ["cut"]], ["digged", ["dug"]], ["drawed", ["drew", "drawn"]], ["drinked", ["drank", "drunk"]],
  ["drived", ["drove", "driven"]], ["eated", ["ate", "eaten"]], ["falled", ["fell", "fallen"]], ["feeded", ["fed"]],
  ["feeled", ["felt"]], ["fighted", ["fought"]], ["finded", ["found"]], ["flied", ["flew", "flown"]], ["forgetted", ["forgot", "forgotten"]],
  ["forgived", ["forgave", "forgiven"]], ["freezed", ["froze", "frozen"]], ["getted", ["got", "gotten"]], ["gived", ["gave", "given"]],
  ["goed", ["went", "gone"]], ["growed", ["grew", "grown"]], ["haved", ["had"]], ["heared", ["heard"]], ["hided", ["hid", "hidden"]],
  ["hitted", ["hit"]], ["holded", ["held"]], ["hurted", ["hurt"]], ["keeped", ["kept"]], ["knowed", ["knew", "known"]],
  ["layed", ["laid"]], ["leaded", ["led"]], ["leaved", ["left"]], ["lended", ["lent"]], ["losed", ["lost"]], ["maked", ["made"]],
  ["meaned", ["meant"]], ["meeted", ["met"]], ["payed", ["paid"]], ["quitted", ["quit"]], ["rided", ["rode", "ridden"]],
  ["ringed", ["rang", "rung"]], ["rised", ["rose", "risen"]], ["runned", ["ran"]], ["sayed", ["said"]], ["seeked", ["sought"]],
  ["selled", ["sold"]], ["sended", ["sent"]], ["shaked", ["shook", "shaken"]], ["shooted", ["shot"]], ["shutted", ["shut"]],
  ["singed", ["sang", "sung"]], ["sinked", ["sank", "sunk"]], ["sitted", ["sat"]], ["sleeped", ["slept"]], ["speaked", ["spoke", "spoken"]],
  ["spended", ["spent"]], ["standed", ["stood"]], ["stealed", ["stole", "stolen"]], ["sticked", ["stuck"]], ["striked", ["struck"]],
  ["swimmed", ["swam", "swum"]], ["taked", ["took", "taken"]], ["teached", ["taught"]], ["teared", ["tore", "torn"]],
  ["telled", ["told"]], ["thinked", ["thought"]], ["throwed", ["threw", "thrown"]], ["understanded", ["understood"]],
  ["waked", ["woke", "woken"]], ["weared", ["wore", "worn"]], ["winned", ["won"]], ["writed", ["wrote", "written"]],
  ["childs", ["children"]], ["childrens", ["children's"]], ["foots", ["feet"]], ["gooses", ["geese"]], ["mans", ["men"]],
  ["mouses", ["mice"]], ["peoples", ["people"]], ["tooths", ["teeth"]], ["womans", ["women"]], ["womens", ["women's"]],
  ["lieing", ["lying"]], ["dieing", ["dying"]], ["tieing", ["tying"]],
]);

const consonant = "[bcdfghjklmnpqrstvwxz]";

const rules: ReadonlyArray<readonly [RegExp, string]> = [
  [new RegExp(`(s|x|z|ch|sh)s$`), "$1es"],
  [new RegExp(`(${consonant})ys$`), "$1ies"],
  [new RegExp(`(${consonant})yed$`), "$1ied"],
  [/(?:f|fe)s$/, "ves"],
  [/oos$/, "oes"],
  [new RegExp(`^(${consonant}*[aeiou])(${consonant})ing$`), "$1$2$2ing"],
  [new RegExp(`^(${consonant}*[aeiou])(${consonant})ed$`), "$1$2$2ed"],
  [/eing$/, "ing"],
];

const regular = (word: string): ReadonlyArray<string> =>
  rules.flatMap(([pattern, replacement]) => {
    const changed = word.replace(pattern, replacement);
    return changed === word ? [] : [changed];
  });

export const inflections_of = (word: string): ReadonlyArray<string> => {
  const lower = word.toLowerCase();
  return [...(irregular.get(lower) ?? []), ...regular(lower)];
};
