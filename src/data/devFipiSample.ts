// Фикстура для DEV: несколько заданий банка ФИПИ (пилот химии ЕГЭ — ответы сверены
// с ключом ФИПИ, часть 2 биологии). Только для локальной проверки тренажёра:
// в проде задания ФИПИ приходят из task_bank (taskBankStore.loadFipiSet).
import type { Task } from './taskBankData'

export const DEV_FIPI_TASKS: Task[] = [
 {
  "id": 900000,
  "subject": "chemistry",
  "section": "1",
  "topic": "1.4",
  "part": 1,
  "line": 4,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Из предложенного перечня выберите два вещества, для каждого из которых <br /> характерно наличие водородных связей между молекулами.</p> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr ><td><input type=\"checkbox\" value=\"1\" onclick='selectVariant6702F5(-1)'></td><td>&nbsp;<b>1)</b>&nbsp;</td><td onclick='selectVariant6702F5(0)'> <P>иодоводород</P> </td></tr><tr ><td><input type=\"checkbox\" value=\"2\" onclick='selectVariant6702F5(-1)'></td><td>&nbsp;<b>2)</b>&nbsp;</td><td onclick='selectVariant6702F5(1)'> <P>метан</P> </td></tr><tr ><td><input type=\"checkbox\" value=\"3\" onclick='selectVariant6702F5(-1)'></td><td>&nbsp;<b>3)</b>&nbsp;</td><td onclick='selectVariant6702F5(2)'> <P>аммиак</P> </td></tr><tr ><td><input type=\"checkbox\" value=\"4\" onclick='selectVariant6702F5(-1)'></td><td>&nbsp;<b>4)</b>&nbsp;</td><td onclick='selectVariant6702F5(3)'> <p>этилен</p> </td></tr><tr ><td><input type=\"checkbox\" value=\"5\" onclick='selectVariant6702F5(-1)'></td><td>&nbsp;<b>5)</b>&nbsp;</td><td onclick='selectVariant6702F5(4)'> <P>фтороводород</P> </td></tr></table>Запишите номера выбранных ответов.</div><br></TD></TR>",
  "answer": "35",
  "solution": "Водородные связи между молекулами образуют NH3 и HF (сильно полярные связи N-H, F-H, неподелённая пара у N и F). HI, CH4, C2H4 их не образуют.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "multi",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "check",
    "answerSource": "fipi",
    "n": 5
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 4,
    "topic": "1.4"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "1.4"
  ],
  "fipiId": "6702F5",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900001,
  "subject": "chemistry",
  "section": "2",
  "topic": "2.1",
  "part": 1,
  "line": 5,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Среди предложенных формул/названий веществ, расположенных <br /> в пронумерованных ячейках, выберите формулы/названия: </p> <p>А) кислотного оксида; </p> <p>Б) средней соли; </p> <p>В)&nbsp;амфотерного гидроксида.</p> <table> <tr > <td> <p><b >1</b></p> <p>пищевая сода</p> </td> <td> <p><b >2</b></p> <p>N<sub>2</sub>O</p> </td> <td> <p><b >3</b></p> <p>оксид хлора(I)</p> </td> </tr> <tr > <td> <p><b >4</b></p> <p>(NH<sub>4</sub>)<sub>2</sub>CO<sub>3</sub></p> </td> <td> <p><b >5</b></p> <p>оксид хрома(III)</p> </td> <td> <p><b >6</b></p> <p>гидроксид бария</p> </td> </tr> <tr > <td> <p><b >7</b></p> <p>(MgOH)<sub>2</sub>CO<sub>3</sub></p> </td> <td> <p><b >8</b></p> <p>Mg(OH)<sub>2</sub></p> </td> <td> <p><b >9</b></p> <p>Zn(OH)<sub>2</sub></p> </td> </tr> </table> <p>Запишите в таблицу номера ячеек, в которых расположены выбранные вещества, под соответствующими буквами.</p> <table> <tr > <td rowspan=\"2\"> <p >Ответ:</p> </td> <td> <p>А</p> </td> <td> <p>Б</p> </td> <td> <p>В</p> </td> </tr> <tr> <td> </td> <td> </td> <td> </td> </tr> </table> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr><td><input type=text size=40 value=\"\" maxlength=\"250\"></td></tr></table></div><br></TD></TR>",
  "answer": "349",
  "solution": "Кислотный оксид - Cl2O (N2O несолеобразующий). Средняя соль - (NH4)2CO3. Амфотерный гидроксид - Zn(OH)2; оксид хрома(III) - оксид, а не гидроксид.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "fill",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "text",
    "answerSource": "fipi"
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 5,
    "topic": "2.1"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "2.1"
  ],
  "fipiId": "59345c",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900002,
  "subject": "chemistry",
  "section": "2",
  "topic": "2.1",
  "part": 1,
  "line": 5,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Среди предложенных формул/названий веществ, расположенных <br /> в пронумерованных ячейках, выберите формулы/названия: А) кислоты; <br /> Б) средней соли; В) кислотного оксида.</p> <table> <tr > <td> <p><b >1</b></p> <p>угарный газ</p> </td> <td> <p><b >2</b></p> <p>H<sub>3</sub>P</p> </td> <td> <p><b >3</b></p> <p>гипохлорит калия</p> </td> </tr> <tr > <td> <p><b >4</b></p> <p>PCl<sub>3</sub><b ></b></p> </td> <td> <p><b >5</b></p> <p>аммиак</p> </td> <td> <p><b >6</b></p> <p>BeO</p> </td> </tr> <tr > <td> <p><b >7</b></p> <p>NaHS</p> </td> <td> <p><b >8</b></p> <p>Mn<sub>2</sub>O<sub>7</sub></p> </td> <td> <p><b >9</b> </p> <p>H<sub>2</sub>Se<b ></b></p> </td> </tr> </table> <p>Запишите в таблицу номера ячеек, в которых расположены выбранные вещества, под соответствующими буквами.</p> <table> <tr > <td rowspan=\"2\"> <p >Ответ:</p> </td> <td> <p>А</p> </td> <td> <p>Б</p> </td> <td> <p>В</p> </td> </tr> <tr> <td> </td> <td> </td> <td> </td> </tr> </table> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr><td><input type=text size=40 value=\"\" maxlength=\"250\"></td></tr></table></div><br></TD></TR>",
  "answer": "938",
  "solution": "Кислота - H2Se (H3P и PH3 - не кислота). Средняя соль - гипохлорит калия KClO. Кислотный оксид - Mn2O7.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "fill",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "text",
    "answerSource": "fipi"
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 5,
    "topic": "2.1"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "2.1"
  ],
  "fipiId": "99E0F3",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900003,
  "subject": "chemistry",
  "section": "1",
  "topic": "1.9",
  "part": 1,
  "line": 6,
  "source": "ФИПИ · открытый банк",
  "question": "<table><tr><td> <p>Даны две пробирки с раствором вещества X. В одну из них добавили&nbsp; небольшое количество раствора гидроксида калия, при этом наблюдали образование белого осадка. В другую пробирку прилили раствор слабого электролита Y. При этом также наблюдали образование белого осадка.</p> <p>Из предложенного перечня выберите вещества X и Y, которые могут вступать в описанные реакции.</p> </td></tr></table>",
  "answer": "15",
  "solution": "Белый осадок Al(OH)3 образуется из сульфата алюминия и под действием КОН (недостаток), и под действием слабого основания NH3·H2O. FeCl3 дал бы бурый осадок.",
  "difficulty": "medium",
  "maxPoints": 2,
  "answerType": "matching",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "select",
    "answerSource": "fipi",
    "cells": [
     "X",
     "Y"
    ],
    "digits": [
     "1",
     "2",
     "3",
     "4",
     "5"
    ],
    "options": [
     "<p>сульфат алюминия</p>",
     "<p>дигидрофосфат калия</p>",
     "<p>хлорид железа(III)</p>",
     "<p>фторид натрия</p>",
     "<p>гидрат аммиака</p>"
    ]
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 6,
    "topic": "1.9"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "1.9",
   "2.2",
   "2.3"
  ],
  "fipiId": "45F879",
  "scoring": "ege_minus_one"
 },
 {
  "id": 900004,
  "subject": "chemistry",
  "section": "1",
  "topic": "1.9",
  "part": 1,
  "line": 6,
  "source": "ФИПИ · открытый банк",
  "question": "<table><tr><td> <p>Даны две пробирки с раствором сульфата алюминия. В первую пробирку добавили раствор вещества X, в результате образовались нерастворимый гидроксид и растворимая соль. Во вторую пробирку добавили раствор вещества Y, в результате образовались две соли, одна из которых выпала <br /> в осадок. Из предложенного перечня выберите вещества X и Y, которые участвовали в описанных реакциях.</p> </td></tr></table>",
  "answer": "34",
  "solution": "X: недостаток KOH осаждает Al(OH)3, в растворе остаётся K2SO4. Y: Na3PO4 даёт AlPO4 (осадок) и Na2SO4 - две соли. Ba(OH)2 дал бы осадок BaSO4 и Al(OH)3, а не две соли.",
  "difficulty": "medium",
  "maxPoints": 2,
  "answerType": "matching",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "select",
    "answerSource": "fipi",
    "cells": [
     "X",
     "Y"
    ],
    "digits": [
     "1",
     "2",
     "3",
     "4",
     "5"
    ],
    "options": [
     "<p>гидроксид магния </p>",
     "<p>гидроксид бария</p>",
     "<p>гидроксид калия </p>",
     "<p>фосфат натрия</p>",
     "<p>ацетат аммония</p>"
    ]
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 6,
    "topic": "1.9"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "1.9",
   "2.2",
   "2.3"
  ],
  "fipiId": "85B7BC",
  "scoring": "ege_minus_one"
 },
 {
  "id": 900005,
  "subject": "chemistry",
  "section": "3",
  "topic": "3.3",
  "part": 1,
  "line": 10,
  "source": "ФИПИ · открытый банк",
  "question": "<table><tr><td> <p>Установите соответствие между названием соединения и классом/группой органических соединений, к которому(-ой) оно принадлежит: к каждой позиции, обозначенной буквой, подберите соответствующую позицию, обозначенную цифрой.</p> </td></tr></table><table ><tr><td>&nbsp;&nbsp;</td><td><table><tr><td ><b><u>НАЗВАНИЕ СОЕДИНЕНИЯ</u></b></td><td>&nbsp;</td><td ><b><u>КЛАСС/ГРУППА ОРГАНИЧЕСКИХ СОЕДИНЕНИЙ</u></b></td></tr><tr ><td><table ><tr><td><b>А)</b>&nbsp;</td><td> <P></P> <P>дезоксирибоза</P> <P></P> </td></tr><tr><td><b>Б)</b>&nbsp;</td><td> <P></P> <P>крахмал</P> <P></P> </td></tr><tr><td><b>В)</b>&nbsp;</td><td> <P></P> <P><I>цис</I>-бутен-2</P> <P></P> </td></tr></table></td><td>&nbsp;&nbsp;&nbsp;</td><td><table ><tr><td><b>1)</b>&nbsp;</td><td> <P></P> <P>спирты</P> <P></P> </td></tr><tr><td><b>2)</b>&nbsp;</td><td> <P></P> <P>пептиды</P> <P></P> </td></tr><tr><td><b>3)</b>&nbsp;</td><td> <P></P> <P>углеводороды</P> <P></P> </td></tr><tr><td><b>4)</b>&nbsp;</td><td> <P>углеводы</P> </td></tr></table></td></tr></table></td></tr></table>Запишите в таблицу выбранные цифры под соответствующими буквами.</TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr><td>",
  "answer": "443",
  "solution": "Дезоксирибоза и крахмал - углеводы, цис-бутен-2 - углеводород (алкен).",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "matching",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "select",
    "answerSource": "fipi",
    "cells": [
     "А",
     "Б",
     "В"
    ],
    "digits": [
     "1",
     "2",
     "3",
     "4"
    ]
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 10,
    "topic": "3.3"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "3.3"
  ],
  "fipiId": "17F426",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900006,
  "subject": "chemistry",
  "section": "3",
  "topic": "3.2",
  "part": 1,
  "line": 11,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Из предложенного перечня веществ выберите два вещества, которые существуют в виде <i >цис</i>-,<i > транс</i>-изомеров.</p> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr ><td><input type=\"checkbox\" value=\"1\" onclick='selectVariant1B8C84(-1)'></td><td>&nbsp;<b>1)</b>&nbsp;</td><td onclick='selectVariant1B8C84(0)'> <P>пропилен</P> </td></tr><tr ><td><input type=\"checkbox\" value=\"2\" onclick='selectVariant1B8C84(-1)'></td><td>&nbsp;<b>2)</b>&nbsp;</td><td onclick='selectVariant1B8C84(1)'> <P>бутен-1</P> </td></tr><tr ><td><input type=\"checkbox\" value=\"3\" onclick='selectVariant1B8C84(-1)'></td><td>&nbsp;<b>3)</b>&nbsp;</td><td onclick='selectVariant1B8C84(2)'> <P>бутен-2</P> </td></tr><tr ><td><input type=\"checkbox\" value=\"4\" onclick='selectVariant1B8C84(-1)'></td><td>&nbsp;<b>4)</b>&nbsp;</td><td onclick='selectVariant1B8C84(3)'> <P>пентен-2</P> </td></tr><tr ><td><input type=\"checkbox\" value=\"5\" onclick='selectVariant1B8C84(-1)'></td><td>&nbsp;<b>5)</b>&nbsp;</td><td onclick='selectVariant1B8C84(4)'> <p>бутадиен-1,3</p> </td></tr></table>Запишите в поле ответа номера выбранных веществ.</div><br></TD></TR>",
  "answer": "34",
  "solution": "Цис-транс-изомерия возможна, если у каждого атома C при двойной связи разные заместители: бутен-2 и пентен-2. У пропилена, бутена-1 и бутадиена-1,3 один из концов двойной связи имеет два H.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "multi",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "check",
    "answerSource": "fipi",
    "n": 5
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 11,
    "topic": "3.2"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "3.2"
  ],
  "fipiId": "1B8C84",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900007,
  "subject": "chemistry",
  "section": "3",
  "topic": "3.8",
  "part": 1,
  "line": 12,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Из предложенного перечня выберите два вещества, при взаимодействии каждого из которых с водой в присутствии катализатора образуется кетон.</p> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr ><td><input type=\"checkbox\" value=\"1\" onclick='selectVariantB00B05(-1)'></td><td>&nbsp;<b>1)</b>&nbsp;</td><td onclick='selectVariantB00B05(0)'> <p>ацетилен</p> </td></tr><tr ><td><input type=\"checkbox\" value=\"2\" onclick='selectVariantB00B05(-1)'></td><td>&nbsp;<b>2)</b>&nbsp;</td><td onclick='selectVariantB00B05(1)'> <p>бутадиен-1,3</p> </td></tr><tr ><td><input type=\"checkbox\" value=\"3\" onclick='selectVariantB00B05(-1)'></td><td>&nbsp;<b>3)</b>&nbsp;</td><td onclick='selectVariantB00B05(2)'> <p>бутин-2</p> </td></tr><tr ><td><input type=\"checkbox\" value=\"4\" onclick='selectVariantB00B05(-1)'></td><td>&nbsp;<b>4)</b>&nbsp;</td><td onclick='selectVariantB00B05(3)'> <p>бутен-2</p> </td></tr><tr ><td><input type=\"checkbox\" value=\"5\" onclick='selectVariantB00B05(-1)'></td><td>&nbsp;<b>5)</b>&nbsp;</td><td onclick='selectVariantB00B05(4)'> <p>бутин-1</p> </td></tr></table>Запишите в поле ответа номера выбранных веществ.</div><br></TD></TR>",
  "answer": "35",
  "solution": "Кетон образуется при гидратации (Кучерова) алкинов с тройной связью не на конце цепи, а также у бутина-1 (присоединение по правилу Марковникова, бутанон). Ацетилен даёт альдегид, бутен-2 - спирт.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "multi",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "check",
    "answerSource": "fipi",
    "n": 5
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 12,
    "topic": "3.8"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "3.4",
   "3.5",
   "3.6",
   "3.7",
   "3.8",
   "3.9",
   "3.10",
   "3.11",
   "3.12",
   "3.13",
   "3.14"
  ],
  "fipiId": "B00B05",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900008,
  "subject": "chemistry",
  "section": "3",
  "topic": "3.9",
  "part": 1,
  "line": 14,
  "source": "ФИПИ · открытый банк",
  "question": "<table><tr><td> <p>Установите соответствие между исходным веществом и продуктом его полного гидрирования: к каждой позиции, обозначенной буквой, подберите соответствующую позицию, обозначенную цифрой.</p> </td></tr></table><table ><tr><td>&nbsp;&nbsp;</td><td><table><tr><td ><b><u>ИСХОДНОЕ ВЕЩЕСТВО</u></b></td><td>&nbsp;</td><td ><b><u>ПРОДУКТ ГИДРИРОВАНИЯ</u></b></td></tr><tr ><td><table ><tr><td><b>А)</b>&nbsp;</td><td> <p>циклопропан</p> </td></tr><tr><td><b>Б)</b>&nbsp;</td><td> <p>пропин</p> </td></tr><tr><td><b>В)</b>&nbsp;</td><td> <p>гексен-1</p> </td></tr><tr><td><b>Г)</b>&nbsp;</td><td> <p>толуол</p> </td></tr></table></td><td>&nbsp;&nbsp;&nbsp;</td><td><table ><tr><td><b>1)</b>&nbsp;</td><td> <p>пропан</p> </td></tr><tr><td><b>2)</b>&nbsp;</td><td> <p>пропанол-1</p> </td></tr><tr><td><b>3)</b>&nbsp;</td><td> <p>пропанол-2</p> </td></tr><tr><td><b>4)</b>&nbsp;</td><td> <p>гексан</p> </td></tr><tr><td><b>5)</b>&nbsp;</td><td> <p>циклогексан</p> </td></tr><tr><td><b>6)</b>&nbsp;</td><td> <p>метилциклогексан</p> </td></tr></table></td></tr></table></td></tr></table>Запишите в таблицу выбранные цифры под соответствующими буквами.</TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr><td>",
  "answer": "1146",
  "solution": "Циклопропан с H2 раскрывает цикл до пропана; пропин при полном гидрировании даёт пропан; гексен-1 - гексан; толуол - метилциклогексан.",
  "difficulty": "medium",
  "maxPoints": 2,
  "answerType": "matching",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "select",
    "answerSource": "fipi",
    "cells": [
     "А",
     "Б",
     "В",
     "Г"
    ],
    "digits": [
     "1",
     "2",
     "3",
     "4",
     "5",
     "6"
    ]
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 14,
    "topic": "3.9"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "3.5",
   "3.6",
   "3.7",
   "3.8",
   "3.9"
  ],
  "fipiId": "65AA89",
  "scoring": "ege_minus_one"
 },
 {
  "id": 900009,
  "subject": "chemistry",
  "section": "1",
  "topic": "1.5",
  "part": 1,
  "line": 17,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Из предложенного перечня выберите два типа реакций, к которым можно отнести взаимодействие хлороводорода с аммиаком.</p> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr ><td><input type=\"checkbox\" value=\"1\" onclick='selectVariant2B5F2F(-1)'></td><td>&nbsp;<b>1)</b>&nbsp;</td><td onclick='selectVariant2B5F2F(0)'> <p>окислительно-восстановительная </p> </td></tr><tr ><td><input type=\"checkbox\" value=\"2\" onclick='selectVariant2B5F2F(-1)'></td><td>&nbsp;<b>2)</b>&nbsp;</td><td onclick='selectVariant2B5F2F(1)'> <p>соединения</p> </td></tr><tr ><td><input type=\"checkbox\" value=\"3\" onclick='selectVariant2B5F2F(-1)'></td><td>&nbsp;<b>3)</b>&nbsp;</td><td onclick='selectVariant2B5F2F(2)'> <p>обмена</p> </td></tr><tr ><td><input type=\"checkbox\" value=\"4\" onclick='selectVariant2B5F2F(-1)'></td><td>&nbsp;<b>4)</b>&nbsp;</td><td onclick='selectVariant2B5F2F(3)'> <p>каталитическая</p> </td></tr><tr ><td><input type=\"checkbox\" value=\"5\" onclick='selectVariant2B5F2F(-1)'></td><td>&nbsp;<b>5)</b>&nbsp;</td><td onclick='selectVariant2B5F2F(4)'> <p>экзотермическая</p> </td></tr></table>Запишите в поле ответа номера выбранных типов реакций.</div><br></TD></TR>",
  "answer": "25",
  "solution": "HCl + NH3 = NH4Cl: реакция соединения без изменения степеней окисления, экзотермическая. Это не обмен и не каталитическая.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "multi",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "check",
    "answerSource": "fipi",
    "n": 5
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 17,
    "topic": "1.5"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "1.5"
  ],
  "fipiId": "2B5F2F",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900010,
  "subject": "chemistry",
  "section": "1",
  "topic": "1.6",
  "part": 1,
  "line": 17,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Из предложенного перечня выберите два типа реакций, к которым можно отнести взаимодействие этилацетата с водой.</p> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr ><td><input type=\"checkbox\" value=\"1\" onclick='selectVariant5527E3(-1)'></td><td>&nbsp;<b>1)</b>&nbsp;</td><td onclick='selectVariant5527E3(0)'> <P>гидрирования</P> </td></tr><tr ><td><input type=\"checkbox\" value=\"2\" onclick='selectVariant5527E3(-1)'></td><td>&nbsp;<b>2)</b>&nbsp;</td><td onclick='selectVariant5527E3(1)'> <P>гидратации</P> </td></tr><tr ><td><input type=\"checkbox\" value=\"3\" onclick='selectVariant5527E3(-1)'></td><td>&nbsp;<b>3)</b>&nbsp;</td><td onclick='selectVariant5527E3(2)'> <P>гидролиза</P> </td></tr><tr ><td><input type=\"checkbox\" value=\"4\" onclick='selectVariant5527E3(-1)'></td><td>&nbsp;<b>4)</b>&nbsp;</td><td onclick='selectVariant5527E3(3)'> <P>обратимая</P> </td></tr><tr ><td><input type=\"checkbox\" value=\"5\" onclick='selectVariant5527E3(-1)'></td><td>&nbsp;<b>5)</b>&nbsp;</td><td onclick='selectVariant5527E3(4)'> <P>нейтрализации </P> </td></tr></table>Запишите в поле ответа номера выбранных типов реакций.</div><br></TD></TR>",
  "answer": "34",
  "solution": "Взаимодействие этилацетата с водой - гидролиз сложного эфира, реакция обратимая (в кислой среде). Не гидратация и не нейтрализация.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "multi",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "check",
    "answerSource": "fipi",
    "n": 5
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 17,
    "topic": "1.6"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "1.6"
  ],
  "fipiId": "5527E3",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900011,
  "subject": "chemistry",
  "section": "1",
  "topic": "1.6",
  "part": 1,
  "line": 18,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Из предложенного перечня выберите <b >все</b> внешние воздействия, которые оказывают влияние на скорость реакции: </p> <p>Fe<sub>(</sub><sub>тв</sub><sub>.)</sub> + 2H<sup>+</sup><sub>(p-p)</sub> = Fe<sup>2+</sup><sub>(p-p)</sub> + H<sub>2(</sub><sub>г</sub><sub>)</sub></p> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr ><td><input type=\"checkbox\" value=\"1\" onclick='selectVariantF3AA6B(-1)'></td><td>&nbsp;<b>1)</b>&nbsp;</td><td onclick='selectVariantF3AA6B(0)'><p>повышение температуры</p></td></tr><tr ><td><input type=\"checkbox\" value=\"2\" onclick='selectVariantF3AA6B(-1)'></td><td>&nbsp;<b>2)</b>&nbsp;</td><td onclick='selectVariantF3AA6B(1)'><p>разбавление раствора кислоты</p></td></tr><tr ><td><input type=\"checkbox\" value=\"3\" onclick='selectVariantF3AA6B(-1)'></td><td>&nbsp;<b>3)</b>&nbsp;</td><td onclick='selectVariantF3AA6B(2)'><p>использование порошка железа вместо гранул железа</p></td></tr><tr ><td><input type=\"checkbox\" value=\"4\" onclick='selectVariantF3AA6B(-1)'></td><td>&nbsp;<b>4)</b>&nbsp;</td><td onclick='selectVariantF3AA6B(3)'><p>увеличение концентрации кислоты в растворе</p></td></tr><tr ><td><input type=\"checkbox\" value=\"5\" onclick='selectVariantF3AA6B(-1)'></td><td>&nbsp;<b>5)</b>&nbsp;</td><td onclick='selectVariantF3AA6B(4)'> <p>повышение давления </p> </td></tr></table>Запишите номера выбранных ответов.</div><br></TD></TR>",
  "answer": "1234",
  "solution": "Скорость зависит от температуры, концентрации кислоты и площади поверхности твёрдого Fe. Давление не влияет, так как газ только продукт, нет газообразных реагентов.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "multi",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "check",
    "answerSource": "fipi",
    "n": 5
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 18,
    "topic": "1.6"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "1.6"
  ],
  "fipiId": "F3AA6B",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900012,
  "subject": "chemistry",
  "section": "1",
  "topic": "1.12",
  "part": 1,
  "line": 19,
  "source": "ФИПИ · открытый банк",
  "question": "<table><tr><td> <p>Установите соответствие между уравнением реакции и веществом-окислителем в этой реакции: к каждой позиции, обозначенной буквой, подберите соответствующую позицию, обозначенную цифрой.</p> </td></tr></table><table ><tr><td>&nbsp;&nbsp;</td><td><table><tr><td ><b><u>УРАВНЕНИЕ РЕАКЦИИ</u></b></td><td>&nbsp;</td><td ><b><u>ОКИСЛИТЕЛЬ</u></b></td></tr><tr ><td><table ><tr><td><b>А)</b>&nbsp;</td><td> <P>N<sub>2</sub>O + H<sub>2</sub> = N<sub>2</sub> + H<sub>2</sub>O</p> </td></tr><tr><td><b>Б)</b>&nbsp;</td><td> <P>H<sub>2</sub> + 2Li = 2LiH</p> </td></tr><tr><td><b>В)</b>&nbsp;</td><td> <P>N<sub>2</sub>H<sub>4</sub> + 2N<sub>2</sub>O = 3N<sub>2</sub> + 2H<sub>2</sub>O</p> </td></tr><tr><td><b>Г)</b>&nbsp;</td><td> <P>N<sub>2</sub>H<sub>4</sub> + H<sub>2</sub> = 2NH<sub>3</sub></p> </td></tr></table></td><td>&nbsp;&nbsp;&nbsp;</td><td><table ><tr><td><b>1)</b>&nbsp;</td><td> <P>N<sub>2</sub>H<sub>4</sub></p> </td></tr><tr><td><b>2)</b>&nbsp;</td><td> <P>N<sub>2</sub>O</p> </td></tr><tr><td><b>3)</b>&nbsp;</td><td> <P>N<sub>2</sub></p> </td></tr><tr><td><b>4)</b>&nbsp;</td><td> <P>H<sub>2</sub></p> </td></tr><tr><td><b>5)</b>&nbsp;</td><td> <P>Li</p> </td></tr></table></td></tr></table></td></tr></table>Запишите в таблицу выбранные цифры под соответствующими буквами.</TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr><td>",
  "answer": "2421",
  "solution": "Окислитель принимает электроны (степень окисления снижается). А: N2O (+1→0). Б: H2 (0→-1) в LiH. В: N2O (+1→0), а N2H4 (-2→0) восстановитель. Г: N2H4 (-2→-3) окисляет H2.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "matching",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "select",
    "answerSource": "fipi",
    "cells": [
     "А",
     "Б",
     "В",
     "Г"
    ],
    "digits": [
     "1",
     "2",
     "3",
     "4",
     "5"
    ]
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 19,
    "topic": "1.12"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "1.3",
   "1.12"
  ],
  "fipiId": "03121F",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900013,
  "subject": "chemistry",
  "section": "1",
  "topic": "1.12",
  "part": 1,
  "line": 19,
  "source": "ФИПИ · открытый банк",
  "question": "<table><tr><td> <p>Установите соответствие между схемой химической реакции и изменением степени окисления восстановителя в этой реакции: к каждой позиции, обозначенной буквой, подберите соответствующую позицию, обозначенную цифрой.</p> </td></tr></table><table ><tr><td>&nbsp;&nbsp;</td><td><table><tr><td ><b><u>СХЕМА РЕАКЦИИ</u></b></td><td>&nbsp;</td><td ><b><u>ИЗМЕНЕНИЕ СТЕПЕНИ ОКИСЛЕНИЯ ВОССТАНОВИТЕЛЯ</u></b></td></tr><tr ><td><table ><tr><td><b>А)</b>&nbsp;</td><td> <p>I<sub>2</sub>+HNO<sub>3</sub>→HIO<sub>3</sub>+NO<sub>2</sub>+H<sub>2</sub>O</p> </td></tr><tr><td><b>Б)</b>&nbsp;</td><td> <p>NH<sub>4</sub>NO<sub>3</sub>→N<sub>2</sub>O+H<sub>2</sub>O</p> </td></tr><tr><td><b>В)</b>&nbsp;</td><td> <p>I<sub>2</sub>+KOH→KI+H<sub>2</sub>O+KIO<sub>3</sub></p> </td></tr></table></td><td>&nbsp;&nbsp;&nbsp;</td><td><table ><tr><td><b>1)</b>&nbsp;</td><td> <p>+5 &rarr; +4</p> </td></tr><tr><td><b>2)</b>&nbsp;</td><td> <p>&nbsp; 0 &rarr; +5</p> </td></tr><tr><td><b>3)</b>&nbsp;</td><td> <p>–3 &rarr; +1</p> </td></tr><tr><td><b>4)</b>&nbsp;</td><td> <p>&nbsp; 0 &rarr; –1</p> </td></tr></table></td></tr></table></td></tr></table>Запишите в таблицу выбранные цифры под соответствующими буквами.</TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr><td>",
  "answer": "232",
  "solution": "Восстановитель повышает степень окисления. А: I2 0→+5 (HIO3). Б: азот аммония -3→+1 (внутримолекулярная ОВР). В: диспропорционирование I2, восстановитель окисляется 0→+5 (KIO3).",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "matching",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "select",
    "answerSource": "fipi",
    "cells": [
     "А",
     "Б",
     "В"
    ],
    "digits": [
     "1",
     "2",
     "3",
     "4"
    ]
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 19,
    "topic": "1.12"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "1.12"
  ],
  "fipiId": "AA88c7",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900014,
  "subject": "chemistry",
  "section": "1",
  "topic": "1.8",
  "part": 1,
  "line": 23,
  "source": "ФИПИ · открытый банк",
  "question": "<table><tr><td> <p>В реактор постоянного объёма поместили вещество А и вещество В. <br /> В результате протекания обратимой реакции в реакционной системе</p> <p>А<sub> (г)</sub> + 2В<sub> (г)</sub> ⇄<sup> </sup>&nbsp;С<sub>(г)</sub></p> <p>установилось химическое равновесие.</p> <p>Используя данные, приведённые в таблице, определите исходную концентрацию В (<i >X</i>) и равновесную концентрацию С (<i >Y</i>).</p> <table> <tr > <td> <p>Реагент</p> </td> <td> <p>А</p> </td> <td> <p>В</p> </td> <td> <p>С</p> </td> </tr> <tr > <td> <p>Исходная концентрация (моль/л)</p> </td> <td> <p>0,7</p> </td> <td> </td> <td> </td> </tr> <tr > <td> <p>Равновесная концентрация (моль/л)</p> </td> <td> <p>0,2</p> </td> <td> <p>0,2</p> </td> <td> </td> </tr> </table> <p>Выберите из списка номера правильных ответов:</p> </td></tr></table>",
  "answer": "42",
  "solution": "A прореагировало 0,7-0,2=0,5 моль/л, значит C=0,5 (Y=2). B расходуется вдвое больше: 1,0 моль/л, исходная B = 1,0+0,2 = 1,2 (X=4).",
  "difficulty": "medium",
  "maxPoints": 2,
  "answerType": "matching",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "select",
    "answerSource": "fipi",
    "cells": [
     "X",
     "Y"
    ],
    "digits": [
     "1",
     "2",
     "3",
     "4",
     "5",
     "6"
    ],
    "options": [
     "<P>0,2 моль/л</P>",
     "<P>0,5 моль/л</P>",
     "<P>1,0 моль/л</P>",
     "<P>1,2 моль/л</P>",
     "<P>1,5 моль/л</P>",
     "<P>1,7 моль/л</P>"
    ]
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 23,
    "topic": "1.8"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "1.8",
   "5.1"
  ],
  "fipiId": "6C8B55",
  "scoring": "ege_minus_one"
 },
 {
  "id": 900015,
  "subject": "chemistry",
  "section": "3",
  "topic": "3.19",
  "part": 1,
  "line": 24,
  "source": "ФИПИ · открытый банк",
  "question": "<table><tr><td> <p>Установите соответствие между реагирующими веществами и признаком&nbsp; протекающей между ними реакции: к каждой позиции, обозначенной буквой, подберите соответствующую позицию, обозначенную цифрой.</p> </td></tr></table><table ><tr><td>&nbsp;&nbsp;</td><td><table><tr><td ><b><u>РЕАГИРУЮЩИЕ ВЕЩЕСТВА</u></b></td><td>&nbsp;</td><td ><b><u>ПРИЗНАК РЕАКЦИИ</u></b></td></tr><tr ><td><table ><tr><td><b>А)</b>&nbsp;</td><td> <p>HOCH<sub>2</sub>CH<sub>2</sub>OH и Cu(OH)<sub>2</sub></p> </td></tr><tr><td><b>Б)</b>&nbsp;</td><td> <p>C<sub>6</sub>H<sub>5</sub>CH<sub>3</sub> и KMnO<sub>4</sub> (Н<sup>+</sup>)</p> </td></tr><tr><td><b>В)</b>&nbsp;</td><td> <p>СH<sub>3</sub>COOH и Fe(OH)<sub>2</sub></p> </td></tr><tr><td><b>Г)</b>&nbsp;</td><td> <P>СH<SUB>3</SUB>COОH и NaHCO<SUB>3</SUB></P> </td></tr></table></td><td>&nbsp;&nbsp;&nbsp;</td><td><table ><tr><td><b>1)</b>&nbsp;</td><td> <P>обесцвечивание раствора</P> </td></tr><tr><td><b>2)</b>&nbsp;</td><td> <p>образование ярко-синего раствора</p> </td></tr><tr><td><b>3)</b>&nbsp;</td><td> <P>образование красного осадка</P> </td></tr><tr><td><b>4)</b>&nbsp;</td><td> <P>выделение газа</P> </td></tr><tr><td><b>5)</b>&nbsp;</td><td> <P>растворение осадка</P> </td></tr></table></td></tr></table></td></tr></table>Запишите в таблицу выбранные цифры под соответствующими буквами.</TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr><td>",
  "answer": "2154",
  "solution": "Этиленгликоль растворяет Cu(OH)2 с образованием ярко-синего раствора. Толуол обесцвечивает подкисленный KMnO4. Уксусная кислота растворяет осадок Fe(OH)2. С NaHCO3 выделяется CO2.",
  "difficulty": "medium",
  "maxPoints": 2,
  "answerType": "matching",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "select",
    "answerSource": "fipi",
    "cells": [
     "А",
     "Б",
     "В",
     "Г"
    ],
    "digits": [
     "1",
     "2",
     "3",
     "4",
     "5"
    ]
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 24,
    "topic": "3.19"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "2.5",
   "3.19"
  ],
  "fipiId": "7CD2D8",
  "scoring": "ege_minus_one"
 },
 {
  "id": 900016,
  "subject": "chemistry",
  "section": "5",
  "topic": "5.7",
  "part": 1,
  "line": 26,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Сколько граммов 14%-ного раствора сульфата меди(II) надо взять, чтобы <br /> при выпаривании 10&nbsp;г воды получить раствор с массовой долей соли 18%? (Запишите число с точностью до целых.)</p> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr><td><input type=text size=40 value=\"\" maxlength=\"250\"></td><td>г&nbsp;</td></tr></table></div><br></TD></TR>",
  "answer": "45",
  "solution": "Пусть масса раствора m: 0,14m = 0,18(m-10), 0,04m = 1,8, m = 45 г.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "fill",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "text",
    "answerSource": "fipi"
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 26,
    "topic": "5.7"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "5.7"
  ],
  "fipiId": "65E006",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900017,
  "subject": "chemistry",
  "section": "1",
  "topic": "1.11",
  "part": 1,
  "line": 26,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Сколько граммов воды следует выпарить из 500 г 10%-ного раствора нитрата бария, чтобы массовая доля соли в растворе стала равной 16&nbsp;%? (Запишите число с точностью до десятых.)</p> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr><td><input type=text size=40 value=\"\" maxlength=\"250\"></td><td>г&nbsp;</td></tr></table></div><br></TD></TR>",
  "answer": "187,5",
  "solution": "Масса соли 50 г. Новая масса раствора 50/0,16 = 312,5 г. Испарить 500-312,5 = 187,5 г воды.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "fill",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "text",
    "answerSource": "fipi"
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 26,
    "topic": "1.11"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "1.11"
  ],
  "fipiId": "EC8DDB",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900018,
  "subject": "chemistry",
  "section": "5",
  "topic": "5.1",
  "part": 1,
  "line": 28,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Какова масса серебра, выделившегося в результате реакции окисления <br /> 0,2 моль уксусного альдегида избытком аммиачного раствора оксида серебра? (Запишите число с точностью до десятых.)</p> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr><td><input type=text size=40 value=\"\" maxlength=\"250\"></td><td>г&nbsp;</td></tr></table></div><br></TD></TR>",
  "answer": "43,2",
  "solution": "CH3CHO + Ag2O = CH3COOH + 2Ag. n(Ag) = 0,4 моль, m = 0,4·108 = 43,2 г.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "fill",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "text",
    "answerSource": "fipi"
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 28,
    "topic": "5.1"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "5.1"
  ],
  "fipiId": "36CD7A",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900019,
  "subject": "chemistry",
  "section": "5",
  "topic": "5.4",
  "part": 1,
  "line": 28,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Технический сульфит натрия массой 14 г, в котором массовая доля примеси сульфата натрия составляет 10%, растворили в избытке соляной кислоты. Определите объём (н.у.) выделившегося при этом газа. (Запишите число с&nbsp;точностью до сотых.)</p> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr><td><input type=text size=40 value=\"\" maxlength=\"250\"></td><td>л&nbsp;</td></tr></table></div><br></TD></TR>",
  "answer": "2,24",
  "solution": "Na2SO3 в техн. образце 14·0,9 = 12,6 г = 0,1 моль. Na2SO3 + 2HCl = 2NaCl + SO2 + H2O, n(SO2)=0,1 моль, V = 2,24 л. Сульфат не реагирует.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "fill",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "text",
    "answerSource": "fipi"
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 28,
    "topic": "5.4"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "5.4"
  ],
  "fipiId": "65A561",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900020,
  "subject": "chemistry",
  "section": "5",
  "topic": "5.5",
  "part": 1,
  "line": 28,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Определите массу спирта, который может быть получен из 63 г глюкозы, если выход продукта реакции составляет 14%. (Запишите число <br /> с точностью до десятых.)</p> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div><table><tr><td><input type=text size=40 value=\"\" maxlength=\"250\"></td><td>г&nbsp;</td></tr></table></div><br></TD></TR>",
  "answer": "4,5",
  "solution": "C6H12O6 -> 2C2H5OH + 2CO2. n(глюк)=63/180=0,35 моль, теор. n(спирта)=0,7 моль, m=32,2 г. С выходом 14%: 32,2·0,14 = 4,508, т.е. 4,5 г.",
  "difficulty": "medium",
  "maxPoints": 1,
  "answerType": "fill",
  "allowPhoto": false,
  "payload": {
   "fipi": {
    "kind": "text",
    "answerSource": "fipi"
   },
   "tags": {
    "exam": "ege",
    "subject": "chemistry",
    "line": 28,
    "topic": "5.5"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "5.5"
  ],
  "fipiId": "E204F1",
  "scoring": "all_or_nothing"
 },
 {
  "id": 900021,
  "subject": "biology",
  "section": "5",
  "topic": "5.2",
  "part": 2,
  "line": 22,
  "source": "ФИПИ · открытый банк",
  "question": "<P>Экспериментатор решил исследовать изменения, происходящие с эритроцитами, помещёнными в растворы с различной концентрацией хлорида натрия. Перед началом эксперимента он выяснил, что концентрация хлорида натрия в плазме крови составляет 0,9%. В рамках эксперимента он разделил кровь по двум сосудам, в каждую из которых добавил растворы NaCl с различной концентрацией в соотношении 1:1 (на 1 мл крови – 1 мл раствора NaCl). По результатам наблюдений экспериментатор сделал рисунки эритроцитов (рис. А и Б). </P> <P>&nbsp;</P> <DIV> <TABLE> <TBODY> <TR> <TD> <P></P></TD></TR> <TR> <TD> <P>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Рис. А&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Рис. Б</P></TD></TR></TBODY></TABLE></DIV> <P>&nbsp;</P> <P>Какой параметр задаётся экспериментатором (независимая переменная), а какой параметр меняется в зависимости от этого (зависимая переменная)? Какое изменение произошло с эритроцитом в сосуде А? Объясните данное явление. Раствор какой концентрации NaCl был добавлен в сосуд на рисунке&nbsp;А, а какой концентрации – в сосуд на рисунке Б?</P> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div>&nbsp;</div><br></TD></TR>",
  "answer": "",
  "solution": "Изменение формы эритроцитов определяется осмосом: в гипертоническом растворе клетка теряет воду и сморщивается, в гипотоническом набухает.",
  "difficulty": "medium",
  "maxPoints": 3,
  "answerType": "extended",
  "allowPhoto": true,
  "payload": {
   "fipi": {
    "kind": "extended",
    "answerSource": "ai",
    "reference": "1) Независимая переменная — концентрация раствора NaCl, добавляемого к крови; зависимая переменная — форма (объём) эритроцитов.\n2) В сосуде А эритроцит сморщился (уменьшился в объёме, стал зубчатым) из-за потери воды.\n3) Причина: раствор в сосуде А гипертонический — концентрация соли в среде выше, чем в эритроците; по законам осмоса вода выходит из клетки в раствор.\n4) В сосуд А добавлен раствор NaCl с концентрацией больше 0,9% (с учётом разбавления 1:1 — более 1,8%); в сосуд Б — раствор менее 0,9% (гипотонический; эритроцит набухает и может лопнуть — гемолиз).",
    "criteria": [
     {
      "label": "К1",
      "text": "Указаны независимая (концентрация NaCl) и зависимая (форма/объём эритроцитов) переменные",
      "max": 1
     },
     {
      "label": "К2",
      "text": "Указано изменение эритроцита в сосуде А и его объяснение через осмос (направление движения воды)",
      "max": 1
     },
     {
      "label": "К3",
      "text": "Указаны концентрации NaCl для сосудов А и Б (гипер- и гипотонический раствор относительно 0,9%)",
      "max": 1
     }
    ]
   },
   "tags": {
    "exam": "ege",
    "subject": "biology",
    "line": 22,
    "topic": "5.2"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "5.2"
  ],
  "fipiId": "71C4F6",
  "scoring": "criteria"
 },
 {
  "id": 900022,
  "subject": "biology",
  "section": "1",
  "topic": "1.3",
  "part": 2,
  "line": 23,
  "source": "ФИПИ · открытый банк",
  "question": "<P>Экспериментатор решил изучить процесс сокращения скелетной мышцы у человека. Для этого испытуемый совершал упражнения с одним и тем же весом с перерывом между упражнениями в одну секунду. Каждый раз экспериментатор записывал силу сокращения мышцы при помощи динамометра. Результаты измерений приведены на графике. </P> <P>&nbsp;</P> <P></P> <P><B>&nbsp;</B></P> <P>Какой параметр задаётся экспериментатором (независимая переменная), а какой параметр меняется в зависимости от заданного (зависимая переменная)? Как можно объяснить изменение динамики силы мышечных сокращений в эксперименте? Какие физиологические процессы происходят при многократном сокращении мышцы без длительного расслабления? Укажите не менее двух процессов.</P> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div>&nbsp;</div><br></TD></TR>",
  "answer": "",
  "solution": "При частых повторах мышца утомляется: расходуются энергетические ресурсы и накапливаются продукты обмена, сила падает.",
  "difficulty": "medium",
  "maxPoints": 3,
  "answerType": "extended",
  "allowPhoto": true,
  "payload": {
   "fipi": {
    "kind": "extended",
    "answerSource": "ai",
    "reference": "1) Независимая переменная — число сокращений мышцы (порядковый номер повторения упражнения, время работы); зависимая — сила сокращения мышцы.\n2) Сила сокращения при многократной работе без достаточного отдыха снижается — развивается утомление мышцы (динамика зависит от запасов энергии и накопления продуктов обмена).\n3) Процессы: расходуются запасы АТФ и гликогена; не хватает кислорода — усиливается анаэробный гликолиз, накапливается молочная кислота; накапливаются продукты обмена, снижается рН; нарушается передача возбуждения в нервно-мышечном синапсе (истощение медиатора ацетилхолина).",
    "criteria": [
     {
      "label": "К1",
      "text": "Верно названы независимая и зависимая переменные",
      "max": 1
     },
     {
      "label": "К2",
      "text": "Объяснено изменение динамики силы сокращений (утомление мышцы)",
      "max": 1
     },
     {
      "label": "К3",
      "text": "Названы не менее двух физиологических процессов (расход АТФ/гликогена, накопление молочной кислоты, кислородное голодание и т. п.)",
      "max": 1
     }
    ]
   },
   "tags": {
    "exam": "ege",
    "subject": "biology",
    "line": 23,
    "topic": "1.3"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "1.3"
  ],
  "fipiId": "A918BF",
  "scoring": "criteria"
 },
 {
  "id": 900023,
  "subject": "biology",
  "section": "1",
  "topic": "1.3",
  "part": 2,
  "line": 23,
  "source": "ФИПИ · открытый банк",
  "question": "<P>Учёный провёл эксперимент с цианобактериями. Для этого он сделал две жидкие идентичные культуральные среды, содержавшие глюкозу, аминокислоты и другие необходимые для жизнедеятельности бактерий вещества. В каждую из сред он поместил одинаковое количество цианобактерий от одной материнской культуры. Культуру в первой среде учёный поставил под круглосуточное освещение, а культуру во второй – поместил в условия полного отсутствия света. Обе культуры находились в стерильных условиях и с доступом атмосферного воздуха. В течение нескольких месяцев учёный измерял биомассу бактерий в двух культурах. Результаты измерений приведены на графике. </P> <P>&nbsp;</P> <P></P> <P><B>&nbsp;</B></P> <P>Какой параметр задаётся экспериментатором (независимая переменная), а какой параметр меняется в зависимости от заданного (зависимая переменная)? Почему на свету в культуре биомасса цианобактерий больше, чем в темноте? Почему даже после кипячения раствора биомасса цианобактерий будет расти? </P> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div>&nbsp;</div><br></TD></TR>",
  "answer": "",
  "solution": "На свету цианобактерии помимо органики среды используют фотосинтез, поэтому растут быстрее; кипячение не уничтожает питательные вещества среды.",
  "difficulty": "medium",
  "maxPoints": 3,
  "answerType": "extended",
  "allowPhoto": true,
  "payload": {
   "fipi": {
    "kind": "extended",
    "answerSource": "ai",
    "reference": "1) Независимая переменная — наличие (отсутствие) освещения; зависимая — биомасса цианобактерий.\n2) Цианобактерии — фотоавтотрофы: на свету они осуществляют фотосинтез и дополнительно синтезируют органические вещества из СО₂ и воды (используя энергию света), поэтому размножаются быстрее и биомасса больше; в темноте они могут использовать только готовые органические вещества среды (глюкозу, аминокислоты) гетеротрофно.\n3) Кипячение стерилизует среду (убивает посторонние микроорганизмы), но не разрушает растворённые в ней органические и минеральные вещества; кроме того, газы (СО₂, О₂) вновь растворяются из воздуха при доступе атмосферы, а цианобактерии вносят в среду после охлаждения, поэтому рост биомассы продолжается.",
    "criteria": [
     {
      "label": "К1",
      "text": "Верно названы независимая и зависимая переменные",
      "max": 1
     },
     {
      "label": "К2",
      "text": "Объяснено различие биомассы на свету и в темноте (фотосинтез, фотоавтотрофия цианобактерий)",
      "max": 1
     },
     {
      "label": "К3",
      "text": "Объяснён рост биомассы после кипячения (питательные вещества сохраняются, газы поступают из воздуха)",
      "max": 1
     }
    ]
   },
   "tags": {
    "exam": "ege",
    "subject": "biology",
    "line": 23,
    "topic": "1.3"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "1.3",
   "4.1"
  ],
  "fipiId": "D4FCBA",
  "scoring": "criteria"
 },
 {
  "id": 900024,
  "subject": "biology",
  "section": "2",
  "topic": "2.5",
  "part": 2,
  "line": 27,
  "source": "ФИПИ · открытый банк",
  "question": "<p>Известно, что комплементарные цепи нуклеиновых кислот антипараллельны (5&#697; концу в одной цепи соответствует 3&#697; конец другой цепи). Синтез нуклеиновых кислот начинается с 5&#697; конца. Рибосома движется по иРНК в&nbsp;направлении от 5&#697; к 3&#697; концу. Все виды РНК синтезируются на ДНК-матрице. В цепи РНК и ДНК могут иметься специальные комплементарные участки – палиндромы, благодаря которым у молекулы может возникать вторичная структура. Фрагмент молекулы ДНК, на которой синтезируется участок центральной петли тРНК, имеет следующую последовательность нуклеотидов (нижняя цепь матричная (транскрибируемая)):</p> <p>5&#697;-АТАТЦТААТГЦАГАТАТ-3&#697;</p> <p>3&#697;-ТАТАГАТТАЦГТЦТАТА-5&#697;</p> <p>Установите нуклеотидную последовательность участка тРНК, который синтезируется на данном фрагменте. Найдите на данном участке палиндром и установите вторичную структуру центральной петли тРНК. Определите аминокислоту, которую будет переносить эта тРНК в процессе биосинтеза белка, если антикодон равноудалён от концов палиндрома. Ответ поясните. Для выполнения задания используйте таблицу генетического кода. При написании нуклеиновых кислот указывайте направление цепи.</p> <p><b>Генетический код (иРНК </b><b>от 5&#697; к 3&#697; концу)</b></p> <table> <tr> <td> <p><b>Первое</b></p> <p><b>основание</b></p> </td> <td colspan=4> <p><b>Второе основание</b></p> </td> <td> <p><b>Третье основание</b></p> </td> </tr> <tr> <td> </td> <td> <p>У</p> </td> <td> <p>Ц</p> </td> <td> <p>А</p> </td> <td> <p>Г</p> </td> <td> </td> </tr> <tr> <td> <p>У</p> </td> <td> <p>Фен</p> <p>Фен</p> <p>Лей</p> <p>Лей</p> </td> <td> <p>Сер</p> <p>Сер</p> <p>Сер</p> <p>Сер</p> </td> <td> <p>Тир</p> <p>Тир</p> <p>–</p> <p>–</p> </td> <td> <p>Цис</p> <p>Цис</p> <p>–</p> <p>Три</p> </td> <td> <p>У</p> <p>Ц</p> <p>А</p> <p>Г</p> </td> </tr> <tr> <td> <p>Ц</p> </td> <td> <p>Лей</p> <p>Лей</p> <p>Лей</p> <p>Лей</p> </td> <td> <p>Про</p> <p>Про</p> <p>Про</p> <p>Про</p> </td> <td> <p>Гис</p> <p>Гис</p> <p>Глн</p> <p>Глн</p> </td> <td> <p>Арг</p> <p>Арг</p> <p>Арг</p> <p>Арг</p> </td> <td> <p>У</p> <p>Ц</p> <p>А</p> <p>Г</p> </td> </tr> <tr> <td> <p>А</p> </td> <td> <p>Иле</p> <p>Иле</p> <p>Иле</p> <p>Мет</p> </td> <td> <p>Тре</p> <p>Тре</p> <p>Тре</p> <p>Тре</p> </td> <td> <p>Асн</p> <p>Асн</p> <p>Лиз</p> <p>Лиз</p> </td> <td> <p>Сер</p> <p>Сер</p> <p>Арг</p> <p>Арг</p> </td> <td> <p>У</p> <p>Ц</p> <p>А</p> <p>Г</p> </td> </tr> <tr> <td> <p>Г</p> </td> <td> <p>Вал</p> <p>Вал</p> <p>Вал</p> <p>Вал</p> </td> <td> <p>Ала</p> <p>Ала</p> <p>Ала</p> <p>Ала</p> </td> <td> <p>Асп</p> <p>Асп</p> <p>Глу</p> <p>Глу</p> </td> <td> <p>Гли</p> <p>Гли</p> <p>Гли</p> <p>Гли</p> </td> <td> <p>У</p> <p>Ц</p> <p>А</p> <p>Г</p> </td> </tr> </table> </TD></TR> <TR><TD> <TABLE> <TR><TD><br><div>&nbsp;</div><br></TD></TR>",
  "answer": "",
  "solution": "Транскрибируем матричную цепь, находим комплементарные концевые участки (шпилька), антикодон — в центре петли, по кодону ЦАУ находим Гис.",
  "difficulty": "medium",
  "maxPoints": 3,
  "answerType": "extended",
  "allowPhoto": true,
  "payload": {
   "fipi": {
    "kind": "extended",
    "answerSource": "ai",
    "reference": "1) Транскрибируется матричная (нижняя) цепь 3'-ТАТАГАТТАЦГТЦТАТА-5', РНК комплементарна ей и антипараллельна: 5'-АУАУЦУААУГЦАГАУАУ-3'.\n2) Палиндром (комплементарные участки, образующие стебель): 5'-АУАУЦУ-3' и 5'-АГАУАУ-3' (концы молекулы); между ними петля 5'-ААУГЦ-3'. Вторичная структура — шпилька: стебель из шести пар нуклеотидов и петля из пяти.\n3) Антикодон расположен в центре петли: 5'-АУГ-3' (3-й, 4-й и 5-й нуклеотиды петли: А-У-Г).\n4) Кодон иРНК комплементарен антикодону и антипараллелен: 5'-ЦАУ-3'. По таблице генетического кода кодону ЦАУ соответствует аминокислота гистидин (Гис); её и переносит данная тРНК.",
    "criteria": [
     {
      "label": "К1",
      "text": "Верно определена нуклеотидная последовательность тРНК с указанием концов цепи",
      "max": 1
     },
     {
      "label": "К2",
      "text": "Найден палиндром и описана вторичная структура (стебель и петля)",
      "max": 1
     },
     {
      "label": "К3",
      "text": "Определены антикодон, кодон иРНК и аминокислота Гис с пояснением",
      "max": 1
     }
    ]
   },
   "tags": {
    "exam": "ege",
    "subject": "biology",
    "line": 27,
    "topic": "2.5"
   }
  },
  "exam": "ege",
  "kimYear": 2026,
  "kes": [
   "2.5"
  ],
  "fipiId": "38F9F2",
  "scoring": "criteria"
 }
]
