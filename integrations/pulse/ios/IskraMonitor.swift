import SwiftUI

struct IskraMonitorSnapshot: Decodable {
    struct State: Decodable { let code: String; let label: String; let at: String }
    let schema_version: Int
    let project: String
    let updated_at: String
    let last_checked_at: String?
    let states: [String: State]
    var checkedAt: Date? {
        guard let value = last_checked_at else { return nil }
        let format = ISO8601DateFormatter(); format.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return format.date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }
    var fresh: Bool { guard let at = checkedAt else { return false }; return Date().timeIntervalSince(at) < 900 && Date().timeIntervalSince(at) > -60 }
}

@MainActor final class IskraMonitor: ObservableObject {
    @Published var snapshot: IskraMonitorSnapshot?
    @Published var failed = false
    private let source = URL(string: "https://raw.githubusercontent.com/Dany-tut/Edu-study/codex/monitor-status/iskra.json")!
    func refresh() async {
        do {
            var request = URLRequest(url: source, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 10)
            request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200, data.count < 65536 else { throw URLError(.badServerResponse) }
            let parsed = try JSONDecoder().decode(IskraMonitorSnapshot.self, from: data)
            guard parsed.schema_version == 1, parsed.project == "iskra", parsed.states["monitor"] != nil,
                  parsed.states.values.allSatisfy({ $0.label.count <= 180 }) else { throw URLError(.cannotParseResponse) }
            snapshot = parsed; failed = false
        } catch { failed = true }
    }
    func project(_ original: Project) -> Project {
        let observed = !failed && snapshot?.fresh == true && snapshot?.states["monitor"]?.code == "observing"
        let label = observed ? (snapshot?.states["incident"]?.label ?? "Подтверждённого вывода нет") : "Серверный статус не подтверждён"
        // A working reader does not establish overall product health.
        let health: Health = .warning
        return Project(id: original.id, name: original.name, summary: "Серверный монитор", platforms: original.platforms, health: health,
                       healthMessage: label, uptime: "—", users: "—", online: "—", downloads: "—",
                       services: [Service(name: "Серверный монитор", detail: label, symbol: "waveform.path.ecg", health: health)])
    }
}
