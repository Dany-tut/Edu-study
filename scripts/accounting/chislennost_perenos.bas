Attribute VB_Name = "PerenosVGodovuyu"
' Перенос выбранного месяца в годовую таблицу руководителя — курс «Бухгалтерия» (Искра).
' ТОЛЬКО если работодатель и ИТ разрешили макросы. Не отключайте защиту ради макроса.
' Перед запуском сохраните копию годовой таблицы. В Excel не запускалось — проверьте на копии.
' Что делает: берёт лист «Перенос в годовую», проверяет статус и строки, спрашивает подтверждение
' и записывает ЗНАЧЕНИЯ D, F, G только в строки выбранного месяца. Прошлые месяцы и столбцы H–L не трогает.
Option Explicit

Sub PerenestiMesyac()
    Dim wsP As Worksheet, wsY As Worksheet, wsL As Worksheet
    Dim r As Long, tr As Long, m As Long, n As Long, blockStart As Long
    Dim org As String, months As Variant, msg As String

    Set wsP = ThisWorkbook.Worksheets("Перенос в годовую")
    Set wsY = ThisWorkbook.Worksheets("Годовая руководителя")   ' если годовая — отдельный файл: Workbooks("Годовая.xlsx").Worksheets(1)
    months = Array("Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь")
    m = CLng(Right(ThisWorkbook.Worksheets("Параметры").Range("B10").Value, 2))

    If wsP.Range("B18").Value <> "Можно переносить" Then
        MsgBox "Перенос остановлен: " & wsP.Range("B18").Value, vbExclamation
        Exit Sub
    End If
    For r = 5 To 17
        org = wsP.Cells(r, 1).Value
        tr = wsP.Cells(r, 3).Value
        blockStart = tr - m
        If wsY.Cells(tr, 1).Value <> months(m - 1) Or wsY.Cells(blockStart, 1).Value <> org Then
            MsgBox "Строка " & tr & " годовой не совпадает: ждали «" & org & " / " & months(m - 1) & "».", vbCritical
            Exit Sub
        End If
        If Len(wsY.Cells(tr, 4).Value & wsY.Cells(tr, 6).Value & wsY.Cells(tr, 7).Value) > 0 Then n = n + 1
    Next r
    msg = "Перенести " & months(m - 1) & " (13 организаций) значениями в D, F, G?"
    If n > 0 Then msg = msg & vbCrLf & "Внимание: у " & n & " организаций этот месяц уже заполнен — значения будут заменены."
    If MsgBox(msg, vbYesNo + vbQuestion, "Перенос в годовую") <> vbYes Then Exit Sub

    On Error Resume Next
    Set wsL = ThisWorkbook.Worksheets("Журнал переноса")
    On Error GoTo 0
    If wsL Is Nothing Then
        Set wsL = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        wsL.Name = "Журнал переноса"
        wsL.Range("A1:H1").Value = Array("Когда", "Кто", "Месяц", "Организация", "Строка", "Было D|F|G", "Стало D|F|G", "Файл")
    End If
    For r = 5 To 17
        tr = wsP.Cells(r, 3).Value
        n = wsL.Cells(wsL.Rows.Count, 1).End(xlUp).Row + 1
        wsL.Cells(n, 1).Value = Now
        wsL.Cells(n, 2).Value = Application.UserName
        wsL.Cells(n, 3).Value = months(m - 1)
        wsL.Cells(n, 4).Value = wsP.Cells(r, 1).Value
        wsL.Cells(n, 5).Value = tr
        wsL.Cells(n, 6).Value = wsY.Cells(tr, 4).Value & "|" & wsY.Cells(tr, 6).Value & "|" & wsY.Cells(tr, 7).Value
        wsY.Cells(tr, 4).Value = wsP.Cells(r, 4).Value   ' D — итого строк
        wsY.Cells(tr, 6).Value = wsP.Cells(r, 5).Value   ' F — ДЕКРЕТ
        wsY.Cells(tr, 7).Value = wsP.Cells(r, 6).Value   ' G — СОВ
        wsL.Cells(n, 7).Value = wsY.Cells(tr, 4).Value & "|" & wsY.Cells(tr, 6).Value & "|" & wsY.Cells(tr, 7).Value
        wsL.Cells(n, 8).Value = ThisWorkbook.Name
    Next r
    MsgBox "Готово: " & months(m - 1) & " перенесён. Сверьте столбец «Сверка» на листе «Перенос в годовую».", vbInformation
End Sub
