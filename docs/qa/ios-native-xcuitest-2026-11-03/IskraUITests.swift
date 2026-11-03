import XCTest

final class IskraUITests: XCTestCase {
    private var currentApp: XCUIApplication?
    override func setUpWithError() throws {
        continueAfterFailure = false
    }
    private func evidence(_ name: String, _ app: XCUIApplication) {
        let picture = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        picture.name = name
        picture.lifetime = .keepAlways
        add(picture)
        let tree = XCTAttachment(string: app.debugDescription)
        tree.name = name + "-accessibility"
        tree.lifetime = .keepAlways
        add(tree)
        print("ISKRA_UI_EVIDENCE \(name)\n\(app.debugDescription)")
    }
    override func tearDownWithError() throws {
        if let app = currentApp { evidence("final-state", app) }
    }

    func test01RoleTeacherFieldsKeyboardAndSwipes() throws {
        let app = XCUIApplication(bundleIdentifier: "com.dany.iskra.debug")
        currentApp = app
        app.launchArguments = ["-AppleLanguages", "(ru)", "-AppleLocale", "ru_RU"]
        app.terminate()
        app.launch()
        evidence("01-launch", app)
        let role = app.buttons.matching(NSPredicate(format: "label CONTAINS[cd] %@ OR label CONTAINS[cd] %@", "Я препод", "I'm a teacher")).firstMatch
        XCTAssertTrue(role.waitForExistence(timeout: 30), "Teacher role card must be rendered in the installed native app")
        evidence("02-role", app)
        role.tap()
        let email = app.textFields["Email"]
        XCTAssertTrue(email.waitForExistence(timeout: 30), "Teacher email field must appear")
        evidence("03-teacher-login", app)
        email.coordinate(withNormalizedOffset: CGVector(dx: 0.25, dy: 0.5)).tap()
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 8), "Software keyboard must appear for email")
        email.typeText("ui-only@example.invalid")
        evidence("04-email-keyboard", app)
        let password = app.textFields["Пароль"]
        XCTAssertTrue(password.waitForExistence(timeout: 5), "Masked password input must be available")
        password.coordinate(withNormalizedOffset: CGVector(dx: 0.25, dy: 0.5)).tap()
        password.typeText("UI-only-not-submitted-123")
        XCTAssertTrue(password.isHittable, "Focused password field must remain hittable")
        let keyboard = app.keyboards.firstMatch
        if keyboard.exists {
            XCTAssertLessThanOrEqual(password.frame.maxY, keyboard.frame.minY + 2, "Active password must not be hidden by software keyboard")
        }
        evidence("05-password-keyboard", app)
        app.swipeUp()
        XCTAssertTrue(email.exists && password.exists, "Vertical scrolling must preserve login form")
        evidence("06-after-scroll", app)
        let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.38))
        let finish = app.coordinate(withNormalizedOffset: CGVector(dx: 0.65, dy: 0.40))
        start.press(forDuration: 0.05, thenDragTo: finish)
        XCTAssertTrue(email.exists && password.exists, "A horizontal edge gesture must not lose the current login form")
        evidence("07-after-edge-gesture", app)
        // Intentionally never submit a login form or create/change credentials.
    }

    func test02SafariFirstRun() throws {
        let app = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        currentApp = app
        app.launch()
        evidence("08-safari-first-run", app)
        for _ in 0..<3 {
            let next = app.buttons.matching(NSPredicate(format: "label == %@ OR label == %@", "Продолжить", "Continue")).firstMatch
            if next.waitForExistence(timeout: 3) { next.tap() } else { break }
        }
        evidence("09-safari-after-first-run", app)
    }

    func test04ReadOnlyProfilesJournalReview() throws {
        let app = XCUIApplication(bundleIdentifier: "com.dany.iskra.debug")
        currentApp = app
        app.launch()
        let role = app.buttons.matching(NSPredicate(format: "label CONTAINS[cd] %@", "Я препод")).firstMatch
        if role.waitForExistence(timeout: 5) { role.tap() }
        let students = app.tabBars.buttons["Ученики"]
        XCTAssertTrue(students.waitForExistence(timeout: 20))
        students.tap()
        evidence("16-local-students-top", app)
        let group = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "QA group A")).firstMatch
        if group.waitForExistence(timeout: 4) { group.tap() }
        let person = app.buttons.matching(NSPredicate(format: "label CONTAINS[cd] %@", "QA Deadline")).firstMatch
        XCTAssertTrue(person.waitForExistence(timeout: 10), "Synthetic student should exist")
        person.tap()
        evidence("17-local-student-profile", app)
        app.swipeUp()
        evidence("18-local-student-profile-scroll", app)
        let back = app.buttons["Закрыть"].firstMatch
        if back.exists { back.tap() }
        else { app.coordinate(withNormalizedOffset: CGVector(dx: 0.01, dy: 0.35)).press(forDuration: 0.05, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.75, dy: 0.37))) }
        evidence("19-local-profile-back", app)
        app.tabBars.buttons["Ещё"].tap()
        let journal = app.buttons["Журнал"]
        XCTAssertTrue(journal.waitForExistence(timeout: 8))
        journal.tap()
        evidence("20-local-course-journal-top", app)
        let filters = app.buttons.matching(NSPredicate(format: "label CONTAINS[cd] %@", "Фильтры")).firstMatch
        if filters.waitForExistence(timeout: 5) { filters.tap(); evidence("21-local-journal-filters", app); app.buttons["Готово"].tap() }
        let results = app.buttons.matching(NSPredicate(format: "label CONTAINS[cd] %@", "Результаты")).firstMatch
        if results.waitForExistence(timeout: 4) { results.tap(); evidence("22-local-journal-results", app); app.buttons["Готово"].tap() }
        app.swipeUp()
        evidence("23-local-course-journal-scroll", app)
        app.tabBars.buttons["Проверка"].tap()
        let review = app.buttons.matching(NSPredicate(format: "label CONTAINS[cd] %@", "QA Deadline")).firstMatch
        XCTAssertTrue(review.waitForExistence(timeout: 8))
        review.tap()
        evidence("24-local-homework-review-top", app)
        app.swipeUp()
        evidence("25-local-homework-review-scroll", app)
        // Read only: never tap finish, send, return for revision or save.
    }

    func test05JournalPanelsReadOnly() throws {
        let app = XCUIApplication(bundleIdentifier: "com.dany.iskra.debug")
        currentApp = app
        app.launch()
        let role = app.buttons.matching(NSPredicate(format: "label CONTAINS[cd] %@", "Я препод")).firstMatch
        if role.waitForExistence(timeout: 5) { role.tap() }
        let more = app.tabBars.buttons["Ещё"]
        XCTAssertTrue(more.waitForExistence(timeout: 20))
        more.tap()
        app.buttons["Журнал"].tap()
        let filters = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Фильтры")).firstMatch
        XCTAssertTrue(filters.waitForExistence(timeout: 20))
        evidence("26-local-journal-ready-top", app)
        filters.tap()
        evidence("27-local-journal-filters", app)
        XCTAssertTrue(app.buttons["Готово"].waitForExistence(timeout: 5))
        app.buttons["Готово"].tap()
        let results = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Результаты")).firstMatch
        XCTAssertTrue(results.waitForExistence(timeout: 8))
        results.tap()
        evidence("28-local-journal-results", app)
        app.buttons["Готово"].tap()
        app.swipeUp()
        evidence("29-local-journal-middle", app)
        for _ in 0..<10 { app.swipeUp() }
        evidence("30-local-journal-bottom", app)
    }
}
