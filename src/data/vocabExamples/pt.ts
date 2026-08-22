// ─────────────────────────────────────────────────────────────────────────────
// Примеры к словам курсов: pt
//
// Написаны руками и перекрывают всё остальное (см. src/lib/cardExamples.ts):
// добытое скриптом предложение показывает слово в контексте, но не выбирает
// контекст — здесь выбран он. Правило то же, что у разговорника: предложение
// короткое, бытовое и такое, из которого значение слова видно без словаря.
//
// Ключ — слово, приведённое exampleKey(): нижний регистр, без «to/the/a».
// Проверка покрытия: npm run check:examples
// ─────────────────────────────────────────────────────────────────────────────

import { x, type ExampleMap } from './model'

export const PT_VOCAB_EXAMPLES: ExampleMap = {
  'mesa': x('A mesa da cozinha é pequena.', 'Кухонный стол маленький.'),  // a mesa
  'não ser que': x('Vou de carro, a não ser que chova muito.', 'Поеду на машине, разве что будет сильный дождь.'),  // a não ser que
  'parte escrita': x('A parte escrita tem duas tarefas.', 'В письменной части два задания.'),  // a parte escrita
  'parte oral': x('A parte oral dura cerca de vinte minutos.', 'Устная часть длится около двадцати минут.'),  // a parte oral
  'prova': x('A prova acontece em novembro.', 'Экзамен проходит в ноябре.'),  // a prova
  'quem': x('A quem devo entregar o formulário?', 'Кому мне отдать бланк?'),  // a quem
  'tarefa': x('A tarefa pede trinta linhas, no mínimo.', 'Задание требует минимум тридцать строк.'),  // a tarefa
  'acontecer': x('O que aconteceu com o seu telefone?', 'Что случилось с твоим телефоном?'),  // acontecer
  'acordar': x('Eu acordo às sete todos os dias.', 'Я просыпаюсь в семь каждый день.'),  // acordar
  'acrescentar': x('Quero acrescentar uma coisa ao que ele disse.', 'Хочу добавить кое-что к тому, что он сказал.'),  // acrescentar
  'afirmou': x('O diretor afirmou que a obra termina em maio.', 'Директор заявил, что работы закончатся в мае.'),  // afirmou
  'agradeceria': x('Agradeceria uma resposta até sexta-feira.', 'Был бы благодарен за ответ до пятницы.'),  // agradeceria
  'aguardo providências': x('Aguardo providências no prazo de cinco dias.', 'Жду принятия мер в течение пяти дней.'),  // aguardo providências
  'aguardo retorno': x('Aguardo retorno sobre o meu pedido.', 'Жду ответа по моему запросу.'),  // aguardo retorno
  'ainda não': x('Eu ainda não recebi o documento.', 'Я ещё не получил документ.'),  // ainda não
  'ainda que': x('Vou de bicicleta, ainda que chova.', 'Поеду на велосипеде, даже если пойдёт дождь.'),  // ainda que
  'alto / baixo': x('Meu irmão é alto e eu sou baixo.', 'Мой брат высокий, а я низкий.'),  // alto / baixo
  'aluga-se': x('Aluga-se apartamento de dois quartos.', 'Сдаётся двухкомнатная квартира.'),  // aluga-se
  'além disso': x('O apartamento é pequeno; além disso, é caro.', 'Квартира маленькая; кроме того, она дорогая.'),  // além disso
  'ano passado': x('No ano passado eu morei em Lisboa.', 'В прошлом году я жил в Лиссабоне.'),  // ano passado
  'antes que': x('Vamos sair antes que comece a chover.', 'Пойдём, прежде чем начнётся дождь.'),  // antes que
  'antigamente': x('Antigamente esta rua era de terra.', 'Раньше эта улица была грунтовой.'),  // antigamente
  'apesar de': x('Apesar de estar cansado, terminei o trabalho.', 'Несмотря на усталость, я закончил работу.'),  // apesar de
  'aprender': x('Estou aprendendo português há um ano.', 'Я учу португальский уже год.'),  // aprender
  'apressar-se': x('Não se apresse, ainda temos tempo.', 'Не торопись, у нас ещё есть время.'),  // apressar-se
  'aprofundar': x('Vou aprofundar esse ponto no segundo parágrafo.', 'Я углублю эту мысль во втором абзаце.'),  // aprofundar
  'aproveitar': x('Aproveite o fim de semana!', 'Хороших выходных! (буквально: воспользуйтесь выходными)'),  // aproveitar
  'arriscar': x('Não quero arriscar tudo em um projeto.', 'Не хочу рисковать всем ради одного проекта.'),  // arriscar
  'arroz e feijão': x('No almoço tem arroz e feijão todos os dias.', 'На обед каждый день рис с фасолью.'),  // arroz e feijão
  'artigo de opinião': x('Escreva um artigo de opinião de trinta linhas.', 'Напишите статью-мнение в тридцать строк.'),  // artigo de opinião
  'pessoas': x('As pessoas aqui falam muito rápido.', 'Люди здесь говорят очень быстро.'),  // as pessoas
  'assistir': x('Ontem assisti a um filme brasileiro.', 'Вчера я посмотрел бразильский фильм.'),  // assistir
  'atenciosamente': x('Atenciosamente, Daniil Silva', 'С уважением, Даниил Силва'),  // atenciosamente
  'avô': x('Meu avô tem oitenta anos.', 'Моему дедушке восемьдесят лет.'),  // avô
  'banho': x('Vou tomar banho antes do jantar.', 'Приму душ перед ужином.'),  // banho
  'beber': x('Você quer beber alguma coisa?', 'Хочешь что-нибудь выпить?'),  // beber
  'beleza': x('Beleza, a gente se vê amanhã.', 'Договорились, увидимся завтра.'),  // beleza
  'brincar': x('As crianças brincam no parque.', 'Дети играют в парке.'),  // brincar
  'cara': x('Aquele cara trabalha comigo.', 'Тот парень работает со мной.'),  // cara
  'caro / barato': x('O hotel é caro, mas o metrô é barato.', 'Отель дорогой, но метро дешёвое.'),  // caro / barato
  'chamar-se': x('Eu me chamo Ana, e você?', 'Меня зовут Ана, а тебя?'),  // chamar-se
  'chegarmos': x('Depois de chegarmos, ligamos para você.', 'После того как мы приедем, позвоним тебе.'),  // chegarmos
  'citar': x('Vou citar o texto de apoio uma vez.', 'Процитирую вспомогательный текст один раз.'),  // citar
  'com gelo': x('Uma água com gelo, por favor.', 'Воду со льдом, пожалуйста.'),  // com gelo
  'com todo o respeito': x('Com todo o respeito, discordo dessa ideia.', 'При всём уважении, я не согласен с этой мыслью.'),  // com todo o respeito
  'compras': x('Vou fazer compras no sábado de manhã.', 'В субботу утром пойду за покупками.'),  // compras
  'concluir': x('Para concluir, o custo é o principal problema.', 'В заключение: главная проблема — стоимость.'),  // concluir
  'conforme': x('Conforme o contrato, o prazo é de dez dias.', 'Согласно договору, срок — десять дней.'),  // conforme
  'conseguir': x('Não consegui abrir o arquivo.', 'Я не смог открыть файл.'),  // conseguir
  'contra-argumento': x('Apresente um contra-argumento e responda a ele.', 'Приведите контраргумент и ответьте на него.'),  // contra-argumento
  'convém': x('Convém enviar o pedido por escrito.', 'Заявку целесообразно отправить письменно.'),  // convém
  'costumava': x('Eu costumava correr todas as manhãs.', 'Раньше я обычно бегал каждое утро.'),  // costumava
  'cujo / cuja': x('A empresa cujo nome esqueci fica no centro.', 'Компания, название которой я забыл, находится в центре.'),  // cujo / cuja
  'cê': x('Cê vai à festa hoje?', 'Ты пойдёшь сегодня на праздник?'),  // cê (você)
  'dado': x('Esse dado vem do relatório de 2022.', 'Этот факт взят из отчёта 2022 года.'),  // dado
  'de acordo com': x('De acordo com a reportagem, o número dobrou.', 'Согласно репортажу, число удвоилось.'),  // de acordo com
  'de certa forma': x('De certa forma, os dois lados têm razão.', 'В определённой мере правы обе стороны.'),  // de certa forma
  'de fato': x('De fato, o preço subiu muito este ano.', 'Действительно, цена в этом году сильно выросла.'),  // de fato
  'de repente': x('De repente a luz apagou.', 'Вдруг погас свет.'),  // de repente
  'defender uma ideia': x('Escolha um lado e defenda uma ideia até o fim.', 'Выберите сторону и отстаивайте мысль до конца.'),  // defender uma ideia
  'deixa eu pensar': x('Deixa eu pensar um minuto.', 'Дай подумать минуту.'),  // deixa eu pensar
  'demorar': x('A entrega demora dois dias.', 'Доставка занимает два дня.'),  // demorar
  'descansar': x('Preciso descansar no domingo.', 'Мне нужно отдохнуть в воскресенье.'),  // descansar
  'destacar': x('Quero destacar dois pontos do texto.', 'Хочу выделить два момента в тексте.'),  // destacar
  'detalhe secundário': x('Não comece pelo detalhe secundário.', 'Не начинайте со второстепенной детали.'),  // detalhe secundário
  'deveria': x('Você deveria falar com o gerente.', 'Тебе следовало бы поговорить с менеджером.'),  // deveria
  'discordo em parte': x('Discordo em parte: o problema não é o preço.', 'Частично не согласен: дело не в цене.'),  // discordo em parte
  'divulgar': x('O jornal divulgou os números na terça.', 'Газета обнародовала цифры во вторник.'),  // divulgar
  'do qual': x('Este é o relatório do qual eu falei.', 'Это тот отчёт, о котором я говорил.'),  // do qual
  'duvido que': x('Duvido que ele chegue no horário.', 'Сомневаюсь, что он придёт вовремя.'),  // duvido que
  'elemento provocador': x('O elemento provocador é uma manchete de jornal.', 'Материал-стимул — газетный заголовок.'),  // elemento provocador
  'em anexo': x('Segue em anexo o comprovante.', 'Во вложении квитанция.'),  // em anexo
  'em frente': x('A farmácia fica em frente ao mercado.', 'Аптека напротив рынка.'),  // em frente
  'em outras palavras': x('Em outras palavras, ninguém leu o aviso.', 'Иными словами, объявление никто не прочитал.'),  // em outras palavras
  'em suma': x('Em suma, o projeto atrasou por falta de gente.', 'В итоге проект задержался из-за нехватки людей.'),  // em suma
  'embora': x('Embora chova, vou sair.', 'Хотя идёт дождь, я выйду.'),  // embora
  'enfim': x('Enfim, decidimos ficar em casa.', 'В итоге мы решили остаться дома.'),  // enfim
  'entendo o ponto': x('Entendo o ponto, mas o prazo é curto.', 'Я понимаю мысль, но срок короткий.'),  // entendo o ponto
  'entrevista': x('A entrevista dura vinte minutos.', 'Интервью длится двадцать минут.'),  // entrevista
  'entrevistador': x('O entrevistador faz três perguntas.', 'Экзаменатор задаёт три вопроса.'),  // entrevistador
  'era preciso que': x('Era preciso que todos assinassem o documento.', 'Нужно было, чтобы все подписали документ.'),  // era preciso que
  'esposa / marido': x('Minha esposa é professora e o marido dela sou eu.', 'Моя жена — учительница, а её муж — это я.'),  // esposa / marido
  'esquecer': x('Esqueci a chave em casa.', 'Я забыл ключ дома.'),  // esquecer
  'estou fazendo': x('Estou fazendo o almoço agora.', 'Я сейчас готовлю обед.'),  // estou fazendo
  'evidência': x('Não há evidência de que o método funcione.', 'Нет свидетельств, что метод работает.'),  // evidência
  'exemplificar': x('Vou exemplificar com o caso do transporte.', 'Приведу пример на случае с транспортом.'),  // exemplificar
  'exigir': x('O trabalho exige muita atenção.', 'Работа требует большого внимания.'),  // exigir
  'faculdade': x('Ele estuda na faculdade de letras.', 'Он учится на филологическом факультете.'),  // faculdade
  'fala-se': x('Aqui se fala português e espanhol.', 'Здесь говорят по-португальски и по-испански.'),  // fala-se
  'filho / filha': x('Tenho um filho e uma filha.', 'У меня сын и дочь.'),  // filho / filha
  'finalidade': x('A finalidade da carta é pedir uma providência.', 'Назначение письма — попросить принять меры.'),  // finalidade
  'foi construído': x('O museu foi construído em 1950.', 'Музей был построен в 1950 году.'),  // foi construído
  'ganhar tempo': x('Fazer a lista antes ajuda a ganhar tempo.', 'Список заранее помогает выиграть время.'),  // ganhar tempo
  'garçom': x('O garçom trouxe a conta.', 'Официант принёс счёт.'),  // garçom
  'gostar de': x('Eu gosto de acordar cedo.', 'Мне нравится рано вставать.'),  // gostar de
  'gostoso': x('Este café está muito gostoso.', 'Этот кофе очень вкусный.'),  // gostoso
  'grato': x('Grato pela atenção.', 'Признателен за внимание.'),  // grato
  'guerra': x('O texto fala da guerra e dos refugiados.', 'Текст говорит о войне и беженцах.'),  // guerra
  'hesitar': x('Não hesite em me escrever.', 'Не колеблясь пишите мне.'),  // hesitar
  'ideia principal': x('Cada parágrafo tem uma ideia principal.', 'В каждом абзаце одна главная мысль.'),  // ideia principal
  'imaginar': x('Imagine que você é o gerente.', 'Представьте, что вы менеджер.'),  // imaginar
  'impedir': x('A chuva impediu a viagem.', 'Дождь помешал поездке.'),  // impedir
  'inaceitável': x('O atraso de um mês é inaceitável.', 'Задержка на месяц неприемлема.'),  // inaceitável
  'informar': x('Venho informar que mudei de endereço.', 'Сообщаю, что сменил адрес.'),  // informar
  'irmão / irmã': x('Meu irmão mora aqui e minha irmã, no Porto.', 'Мой брат живёт здесь, а сестра — в Порту.'),  // irmão / irmã
  'isso me lembra': x('Isso me lembra a minha primeira semana aqui.', 'Это мне напоминает мою первую неделю здесь.'),  // isso me lembra
  'lamentar': x('Lamento informar que o evento foi cancelado.', 'С сожалением сообщаю, что мероприятие отменено.'),  // lamentar
  'leitor': x('O leitor precisa entender sem reler.', 'Читатель должен понять без перечитывания.'),  // leitor
  'lembrar-se': x('Não me lembro do nome dele.', 'Я не помню его имени.'),  // lembrar-se
  'levantar-se': x('Levanto-me às seis da manhã.', 'Я встаю в шесть утра.'),  // levantar-se
  'logo depois': x('Logo depois do almoço, temos reunião.', 'Сразу после обеда у нас встреча.'),  // logo depois
  'mais novo': x('Ele é dois anos mais novo que eu.', 'Он на два года младше меня.'),  // mais novo
  'manchete': x('A manchete diz que o preço caiu.', 'Заголовок говорит, что цена упала.'),  // manchete
  'me diz': x('Me diz uma coisa: você já almoçou?', 'Скажи мне: ты уже пообедал?'),  // me diz
  'morar': x('Eu moro em São Paulo há três anos.', 'Я живу в Сан-Паулу три года.'),  // morar
  'moço / moça': x('Moço, pode trazer a conta?', 'Молодой человек, можете принести счёт?'),  // moço / moça
  'mudar de vida': x('Ele mudou de vida depois dos quarenta.', 'Он изменил жизнь после сорока.'),  // mudar de vida
  'na minha experiência': x('Na minha experiência, isso raramente funciona.', 'По моему опыту, это редко работает.'),  // na minha experiência
  'na minha opinião': x('Na minha opinião, a escola deveria começar mais tarde.', 'По моему мнению, школа должна начинаться позже.'),  // na minha opinião
  'na prática': x('Na teoria é simples; na prática, não.', 'В теории просто; на практике — нет.'),  // na prática
  'naquela época': x('Naquela época eu não falava português.', 'В ту пору я не говорил по-португальски.'),  // naquela época
  'no caso de': x('No caso de atraso, avise por mensagem.', 'В случае опоздания предупредите сообщением.'),  // no caso de
  'no entanto': x('O preço é bom; no entanto, o prazo é longo.', 'Цена хорошая; однако срок долгий.'),  // no entanto
  'no meu país': x('No meu país o inverno dura seis meses.', 'В моей стране зима длится полгода.'),  // no meu país
  'no momento': x('No momento não posso falar.', 'В данный момент я не могу говорить.'),  // no momento
  'no qual': x('Este é o bairro no qual eu cresci.', 'Это район, в котором я вырос.'),  // no qual
  'no seu lugar': x('No seu lugar, eu aceitaria a proposta.', 'На вашем месте я бы принял предложение.'),  // no seu lugar
  'não necessariamente': x('Mais caro não significa necessariamente melhor.', 'Дороже не обязательно значит лучше.'),  // não necessariamente
  'carro': x('O carro está na garagem.', 'Машина в гараже.'),  // o carro
  'certificado': x('O certificado chega pelo correio.', 'Сертификат приходит по почте.'),  // o certificado
  'enunciador': x('O enunciador é um morador do bairro.', 'Тот, от чьего лица пишем, — житель района.'),  // o enunciador
  'gênero': x('O gênero do texto é uma carta de reclamação.', 'Жанр текста — письмо-жалоба.'),  // o gênero
  'interlocutor': x('Escreva pensando no interlocutor: quem vai ler?', 'Пишите, думая об адресате: кто это прочитает?'),  // o interlocutor
  'problema': x('O problema é o preço, não o prazo.', 'Проблема в цене, а не в сроке.'),  // o problema
  'propósito': x('O propósito do texto é convencer o leitor.', 'Цель текста — убедить читателя.'),  // o propósito
  'obrigado / obrigada': x('Obrigado! — disse ele; Obrigada! — disse ela.', '«Спасибо!» — сказал он; «Спасибо!» — сказала она.'),  // obrigado / obrigada
  'oi / olá': x('Oi, tudo bem? Olá, bom dia.', 'Привет, как дела? Здравствуйте, добрый день.'),  // oi / olá
  'pães': x('Os pães ficam prontos às seis da manhã.', 'Хлеб бывает готов в шесть утра.'),  // os pães
  'ou seja': x('Chego tarde, ou seja, depois das nove.', 'Приду поздно, то есть после девяти.'),  // ou seja
  'para onde': x('Para onde vai esse ônibus?', 'Куда идёт этот автобус?'),  // para onde
  'para que': x('Trouxe o mapa para que a gente não se perca.', 'Я взял карту, чтобы мы не заблудились.'),  // para que
  'parafrasear': x('Parafraseie a pergunta em vez de copiá-la.', 'Перефразируйте вопрос вместо того, чтобы копировать.'),  // parafrasear
  'parece que': x('Parece que vai chover à tarde.', 'Кажется, днём пойдёт дождь.'),  // parece que
  'perceber': x('Percebi que ninguém tinha lido o aviso.', 'Я заметил, что объявление никто не прочитал.'),  // perceber
  'perguntou se': x('Ele perguntou se eu falava português.', 'Он спросил, говорю ли я по-португальски.'),  // perguntou se
  'permitir': x('O prédio não permite animais.', 'В доме не разрешают животных.'),  // permitir
  'perto de': x('Moro perto do centro.', 'Я живу рядом с центром.'),  // perto de
  'polêmica': x('O texto trata de uma polêmica antiga.', 'Текст касается давней полемики.'),  // polêmica
  'ponto de vista': x('Do meu ponto de vista, o custo é alto.', 'С моей точки зрения, стоимость высокая.'),  // ponto de vista
  'por exemplo': x('Muitas cidades, por exemplo Recife, cresceram rápido.', 'Многие города, например Ресифи, быстро выросли.'),  // por exemplo
  'por outro lado': x('Por outro lado, o transporte melhorou.', 'С другой стороны, транспорт стал лучше.'),  // por outro lado
  'portanto': x('Chove muito; portanto, o jogo foi adiado.', 'Идёт сильный дождь, следовательно, матч перенесли.'),  // portanto
  'prejuízo': x('O atraso causou prejuízo à empresa.', 'Задержка причинила ущерб компании.'),  // prejuízo
  'pretender': x('Pretendo morar no Brasil por dois anos.', 'Я намереваюсь прожить в Бразилии два года.'),  // pretender
  'prezado / prezada': x('Prezado senhor, venho por meio desta solicitar…', 'Уважаемый господин, настоящим обращаюсь с просьбой…'),  // prezado / prezada
  'protocolo': x('Anote o número de protocolo do pedido.', 'Запишите номер обращения.'),  // protocolo
  'providência': x('Peço uma providência até o dia dez.', 'Прошу принять меры до десятого числа.'),  // providência
  'público-alvo': x('O público-alvo do texto são os moradores.', 'Целевая аудитория текста — жители.'),  // público-alvo
  'quando cheguei': x('Quando cheguei, a loja já estava fechada.', 'Когда я приехал, магазин уже был закрыт.'),  // quando cheguei
  'quando eu tiver': x('Quando eu tiver tempo, eu te ligo.', 'Когда у меня будет время, я тебе позвоню.'),  // quando eu tiver
  'quanto custa': x('Quanto custa a passagem?', 'Сколько стоит билет?'),  // quanto custa?
  'que tal…': x('Que tal um café depois do trabalho?', 'Как насчёт кофе после работы?'),  // que tal…?
  'queria que': x('Queria que você visse isso hoje.', 'Я хотел, чтобы ты посмотрел это сегодня.'),  // queria que
  'rato': x('Tem um rato na cozinha do prédio.', 'В кухне дома мышь.'),  // rato
  'reclamação': x('Escrevi uma reclamação sobre o barulho.', 'Я написал жалобу на шум.'),  // reclamação
  'recomendar': x('Recomendo o restaurante da esquina.', 'Рекомендую ресторан на углу.'),  // recomendar
  'reformular': x('Vou reformular a frase para ficar mais clara.', 'Переформулирую фразу, чтобы было понятнее.'),  // reformular
  'relatar': x('A carta relata o que aconteceu na segunda.', 'Письмо излагает, что произошло в понедельник.'),  // relatar
  'reportagem': x('A reportagem mostra os dois lados.', 'Репортаж показывает обе стороны.'),  // reportagem
  'ressaltar': x('Ressalto que o prazo já passou.', 'Подчёркиваю, что срок уже прошёл.'),  // ressaltar
  'ressarcimento': x('Solicito o ressarcimento do valor pago.', 'Прошу возместить уплаченную сумму.'),  // ressarcimento
  'resumir': x('Resuma o texto em três frases.', 'Кратко изложите текст в трёх предложениях.'),  // resumir
  'resumo': x('O resumo tem no máximo dez linhas.', 'Краткое изложение — максимум десять строк.'),  // resumo
  'se eu puder': x('Se eu puder, passo aí amanhã.', 'Если смогу, зайду завтра.'),  // se eu puder
  'segunda-feira': x('A reunião é na segunda-feira de manhã.', 'Встреча в понедельник утром.'),  // segunda-feira
  'sempre que': x('Sempre que chove, o trânsito para.', 'Всякий раз, когда идёт дождь, движение встаёт.'),  // sempre que
  'senhor / senhora': x('Com licença, senhor, este lugar está livre?', 'Извините, сударь, это место свободно?'),  // senhor / senhora
  'sentir-se': x('Não me sinto bem hoje.', 'Сегодня я плохо себя чувствую.'),  // sentir-se
  'ser aprovado': x('O projeto foi aprovado pela prefeitura.', 'Проект был одобрен мэрией.'),  // ser aprovado
  'ser realizado': x('O evento será realizado no sábado.', 'Мероприятие будет проведено в субботу.'),  // ser realizado
  'seria': x('Seria melhor conversar pessoalmente.', 'Было бы лучше поговорить лично.'),  // seria
  'seria interessante': x('Seria interessante ouvir os moradores.', 'Было бы интересно послушать жителей.'),  // seria interessante
  'seria possível': x('Seria possível remarcar para quinta?', 'Было бы возможно перенести на четверг?'),  // seria possível
  'sexta-feira': x('Até sexta-feira eu envio o relatório.', 'До пятницы я отправлю отчёт.'),  // sexta-feira
  'simpático': x('O vizinho novo é muito simpático.', 'Новый сосед очень приятный.'),  // simpático
  'sintetizar': x('Sintetize os dois argumentos em uma frase.', 'Обобщите оба аргумента в одном предложении.'),  // sintetizar
  'solicitar': x('Venho solicitar a segunda via do documento.', 'Прошу выдать дубликат документа.'),  // solicitar
  'solicito': x('Solicito resposta no prazo de cinco dias úteis.', 'Прошу ответить в течение пяти рабочих дней.'),  // solicito
  'sonhar': x('Sonho em morar perto do mar.', 'Мечтаю жить у моря.'),  // sonhar
  'sonho': x('Meu sonho é abrir um café.', 'Моя мечта — открыть кофейню.'),  // sonho
  'sugerir': x('Sugiro começar pela parte mais difícil.', 'Предлагаю начать с самой трудной части.'),  // sugerir
  'talvez fosse melhor': x('Talvez fosse melhor esperar mais uma semana.', 'Возможно, было бы лучше подождать ещё неделю.'),  // talvez fosse melhor
  'te ajudo': x('Se quiser, te ajudo com a mudança.', 'Если хочешь, помогу тебе с переездом.'),  // te ajudo
  'tende a': x('O preço tende a subir no verão.', 'Летом цена имеет тенденцию расти.'),  // tende a
  'ter que': x('Tenho que sair às cinco.', 'Мне надо уйти в пять.'),  // ter que
  'terminar': x('Terminei o relatório ontem à noite.', 'Я закончил отчёт вчера вечером.'),  // terminar
  'todos os dias': x('Eu tomo café todos os dias às oito.', 'Я пью кофе каждый день в восемь.'),  // todos os dias
  'trecho': x('Leia o trecho final do texto.', 'Прочитайте заключительный фрагмент текста.'),  // trecho
  'trecho principal': x('Sublinhe o trecho principal antes de responder.', 'Подчеркните ключевой фрагмент перед ответом.'),  // trecho principal
  'tu': x('Tu vais à praia hoje?', 'Ты пойдёшь сегодня на пляж?'),  // tu
  'tá': x('Tá bom, a gente faz assim.', 'Ладно, сделаем так.'),  // tá (está)
  'vez que': x('Uma vez que o prazo passou, o pedido foi cancelado.', 'Поскольку срок прошёл, заказ отменили.'),  // uma vez que
  'valer a pena': x('Vale a pena visitar o museu.', 'Музей стоит посетить.'),  // valer a pena
  'valeu': x('Valeu pela ajuda!', 'Спасибо за помощь!'),  // valeu
  'vela': x('Acendi uma vela quando faltou luz.', 'Я зажёг свечу, когда отключили свет.'),  // vela
  'velha': x('Esta casa é velha, mas é boa.', 'Этот дом старый, но хороший.'),  // velha
  'vende-se': x('Vende-se carro em bom estado.', 'Продаётся машина в хорошем состоянии.'),  // vende-se
  'venho por meio desta': x('Venho por meio desta solicitar o reembolso.', 'Настоящим обращаюсь с просьбой о возврате средств.'),  // venho por meio desta
  'vestir-se': x('Ele se veste muito bem.', 'Он очень хорошо одевается.'),  // vestir-se
  'veículo': x('A notícia saiu em um veículo local.', 'Новость вышла в местном издании.'),  // veículo
  'vontade': x('Não tenho vontade de sair hoje.', 'Сегодня у меня нет желания выходить.'),  // vontade
  'é possível que': x('É possível que a reunião mude de dia.', 'Возможно, встреча перенесётся на другой день.'),  // é possível que
}
