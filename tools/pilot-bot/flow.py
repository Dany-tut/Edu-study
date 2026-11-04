"""Диалог закрытого пилота Искры. Сеть и хранение отделены от переходов."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CARDS = json.loads((ROOT / "cards.json").read_text())
NEXT = dict(zip("t08 t09 t11a t11v t11b t12 t13 t14 t15 t16 t17 u08 u09 u10 u11 u12 u13 u14".split(),
                "t09 t10 t11v t12 t12 t13 t14 t15 t16 t17 finish u09 u10 u11 u12 u13 u14 finish".split()))
RESERVE = {"t08": "group", "t10": "lesson", "t11a": "course", "t11v": "lesson",
           "t11b": "lesson", "t12": "editor", "t14": "assignment", "t15": "course",
           "u09": "lesson", "u11": "assignment"}
LABELS = {"ok": "Получилось", "skip": "Пропустить", "issue": "Есть проблема",
          "comment": "Комментарий", "hint": "Подсказка", "done": "Готово",
          "cancel": "Отмена", "retry": "Повторить", "resume": "Продолжить",
          "general": "Про другое", "here": "Про этот шаг", "pause": "Вернуться позже"}


def initial():
    return dict(step="role", role="", device="", name="", mode="", results={}, reviews=0, revision=0)


def view(s, kit):
    step, mode = s["step"], s["mode"]
    picture = None
    links = []
    if mode == "topic":
        msg, buttons = "К чему относится отзыв?", ["here", "general", "cancel"]
    elif mode == "draft":
        msg = "Что произошло? Можно написать, отправить фото, видео, голосовое или записать кружок прямо здесь. Затем нажмите «Готово»."
        if s["parts"]:
            msg = f"В отзыве сообщений: {len(s['parts'])}. Можно добавить ещё или нажать «Готово»."
        buttons = ["done", "cancel"]
    elif mode == "after":
        msg, buttons = "Проблема записана. Попробуем ещё раз или перейдём дальше?", ["retry", "skip"]
    elif mode == "pause":
        msg, buttons = "Прогресс сохранён. Когда будете готовы, продолжим с этого места.", ["resume", "comment"]
    elif mode == "skipped":
        msg = "Какое задание хотите повторить?"
        buttons = [("back_"+k, CARDS[k]["title"]) for k,v in s["results"].items() if v == "skip"]
        buttons.append(("finish", "К итогам"))
    elif step == "role":
        picture = "start"
        msg = "Выберите, как вы пользуетесь Искрой. Я покажу задания для вашей роли, а после каждого спрошу, как всё прошло."
        msg += "\n\nВ конце — подарок. Преподавателю подарим шаблон занятия на 15 минут, ученику — карточку для подготовки к проверочной."
        buttons = [("t", "Я преподаватель"), ("u", "Я ученик")]
    elif step == "name":
        picture = "cover-" + s["role"]
        msg = "Как вас записать? Пришлите имя и фамилию."
        buttons = []
        if s["name"]:
            msg = f"Записать вас как {s['name']}? Можно прислать имя и фамилию сообщением."
            buttons = [("confirm", "Да, всё верно")]
    elif step == "device":
        msg = "В этом тесте задания выполняются в Искре на компьютере. Этот чат можно держать открытым на телефоне или на компьютере и переключаться между ними."
        buttons = [("desktop", "Я за компьютером"), "pause"]
    elif step == "account":
        msg, buttons = "У вас уже есть аккаунт выбранной роли в Искре?", [("login", "Уже есть"), ("register", "Ещё нет")]
    elif step == "access":
        msg, buttons = "Для следующего задания нужен вход в кабинет. Попробуем ещё раз?", ["retry", "pause", "comment"]
    elif step == "finish":
        msg = f"Спасибо! Получилось: {list(s['results'].values()).count('ok')}. Пропущено: {list(s['results'].values()).count('skip')}. Отзывов: {s['reviews']}. Чтобы пройти маршрут другой роли, нажмите /role."
        if s["role"] == "t":
            gift = ("🎁 Ваш шаблон занятия на 15 минут\n"
                    "Тема: ____. К концу занятия ученик сможет ____.\n\n"
                    "2 мин · Старт. «Что вы уже знаете про ____?»\n"
                    "4 мин · Пример. Покажите, как решить ____. Попросите назвать первый шаг.\n"
                    "6 мин · Практика. Дайте похожую задачу с одним изменением. «Что теперь придётся сделать иначе?»\n"
                    "3 мин · Проверка. «Объясните решение в двух фразах и придумайте свой пример».")
        else:
            gift = ("🎁 Ваша карточка подготовки к проверочной\n"
                    "Тема: ____. Дата: ____.\n\n"
                    "① Закройте конспект. Какие три вещи вы помните по теме? ____\n"
                    "② Решите один пример без подсказки. Где возникло сомнение? ____\n"
                    "③ Сверьтесь с разбором. Как заметить эту ошибку в следующий раз? ____\n"
                    "④ На завтра: какой похожий пример вы попробуете решить самостоятельно? ____")
        msg += "\n\n" + gift + "\n\nМожно переслать этот шаблон в «Избранное» и заполнять заново."
        buttons = [("skipped", "К пропущенным")] if "skip" in s["results"].values() else []
        buttons.append("comment")
    elif step == "t10" and s["device"] == "mobile":
        msg = "Для конструктора курсов откройте Искру на компьютере. Вернитесь в этот чат, когда будете готовы."
        buttons = [("desktop", "Я за компьютером"), "pause", ("finish", "Завершить"), "comment"]
    else:
        card = CARDS[step]
        msg = card["title"] + "\n\n" + card["text"].replace("{номер}", kit["number"])
        picture = step
        if s["device"] == "mobile" and step not in ("u08", "u13"):
            msg += "\n\nНа снимке показана версия для компьютера."
        if step == "u08" and s["device"] == "mobile":
            picture = "u08m"
        if step == "u13" and s["device"] == "mobile":
            picture = "u13m"
        if step == "t10":
            buttons = [("new", "С нуля"), ("material", "Готовый материал")]
        else:
            buttons = ["ok"]
        buttons += ["issue", "skip", "comment"]
        if card.get("hint"):
            buttons.append("hint")
        url = kit.get(step)
        if step.endswith("05b") and not url:
            msg += "\n\n" + kit.get("invite_notice", "Если ссылки нет, нажмите «Есть проблема» и напишите, что приглашение не пришло.")
        if url:
            links.append(("Открыть регистрацию" if step.endswith("05b") else "Открыть Искру", url))
        if s.get("reserve"):
            url = kit.get(s["reserve"])
            if url:
                links.append(("Резервный пример", url))
            else:
                msg += "\n\nЕсли нужного примера нет в кабинете, пропустите этот шаг."
    return msg, buttons, picture, links


def payload(message):
    part = {"text": message.get("caption") or message.get("text", "")}
    for kind in ("photo", "video_note", "video", "voice", "document", "audio"):
        if kind in message:
            media = message[kind][-1] if kind == "photo" else message[kind]
            part.update(kind=kind, file_id=media["file_id"])
            break
    return part if part.get("file_id") or part["text"] else None


def begin(s, mode, kind="comment", part=None):
    s.update(return_mode=s["mode"], mode=mode, kind=kind, parts=[part] if part else [])


def transition(s, action, part=None):
    """Возвращает завершённый отзыв для атомарной записи вместе с прогрессом."""
    step, mode = s["step"], s["mode"]
    if action == "feedback":
        if mode not in ("topic", "draft"):
            begin(s, "topic")
    elif action == "message" and mode == "draft":
        s["parts"].append(part)
    elif action == "message" and mode == "topic":
        s["parts"].append(part)
    elif action == "message" and step == "name" and not mode and not part.get("kind"):
        s.update(name=part["text"][:100], step="device")
    elif action == "message":
        begin(s, "topic", part=part)
    elif action == "comment":
        begin(s, "topic")
    elif action == "issue":
        begin(s, "draft", "issue")
    elif action in ("general", "here") and mode == "topic":
        s.update(mode="draft", kind="general" if action == "general" else "comment")
    elif action == "done" and mode == "draft" and s["parts"]:
        report = dict(role=s["role"], name=s["name"], device=s["device"], kind=s["kind"],
                      step=None if s["kind"] == "general" else step, parts=s.pop("parts"))
        s["reviews"] += 1
        s["mode"] = "after" if s["kind"] == "issue" else s["return_mode"]
        return report
    elif action == "cancel":
        s["mode"] = s.get("return_mode", "")
        s.pop("parts", None)
    elif action in ("pause", "skipped"):
        s["mode"] = action
    elif action == "resume":
        s["mode"] = ""
    elif action == "retry":
        s["mode"] = ""
        if step == "access":
            s["step"] = s["entry"]
    elif action in ("t", "u"):
        s.update(role=action, step="device")
    elif action == "confirm":
        s["step"] = "device"
    elif action in ("mobile", "desktop"):
        s["device"] = action
        if step == "device":
            s["step"] = "account"
    elif action in ("login", "register"):
        s["entry"] = s["role"] + ("05a" if action == "login" else "05b")
        s["step"] = s["entry"]
    elif action.startswith("back_"):
        s.update(step=action[5:], mode="", revisit=True, reserve=None)
    elif action == "finish":
        s.update(step="finish", mode="")
    elif action in ("ok", "skip", "new", "material"):
        skipped = action == "skip"
        s["results"][step] = "skip" if skipped else "ok"
        s["reserve"] = RESERVE.get(step) if skipped else None
        if step.endswith(("05a", "05b")):
            dest = "access" if skipped else s["role"] + "08"
        elif step == "t10":
            dest = {"new": "t11a", "material": "t11b", "skip": "t12"}[action]
        else:
            dest = NEXT[step]
        s.update(step="finish" if s.pop("revisit", False) else dest, mode="")
